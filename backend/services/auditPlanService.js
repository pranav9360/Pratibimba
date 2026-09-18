import AuditPlan from "../models/AuditPlan.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import AppError from "../utils/AppError.js";

const getNextIqaNumber = async () => {
  const currentYear = new Date().getFullYear();
  const pattern = new RegExp(`^IQA-${currentYear}-(\\d{4})$`);

  const [plans, scheduledAudits, reports] = await Promise.all([
    AuditPlan.find(
      { iqaNumber: new RegExp(`^IQA-${currentYear}-`) },
      "iqaNumber"
    ).lean(),

    ScheduledAudit.find(
      { iqaNumber: new RegExp(`^IQA-${currentYear}-`) },
      "iqaNumber"
    ).lean(),

    Report.find(
      { iqaNumber: new RegExp(`^IQA-${currentYear}-`) },
      "iqaNumber"
    ).lean(),
  ]);

  let maxNumber = 0;

  const records = [
    ...plans,
    ...scheduledAudits,
    ...reports,
  ];

  for (const record of records) {
    if (!record.iqaNumber) continue;

    const match = record.iqaNumber.match(pattern);

    if (!match) continue;

    const number = parseInt(match[1], 10);

    if (number > maxNumber) {
      maxNumber = number;
    }
  }

  const nextNumber = maxNumber + 1;

  return `IQA-${currentYear}-${String(nextNumber).padStart(4, "0")}`;
};

export const getAuditPlans = async () => {
  return await AuditPlan.find()
    .collation({
      locale: "en",
      numericOrdering: true,
    })
    .sort({
      iqaNumber: 1,
    });
};

export const getAuditPlanById = async (id) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  return plan;
};

export const createAuditPlan = async (data) => {
  const iqaNumber = await getNextIqaNumber();

  /*
   * Auditor assignment belongs to scheduling.
   * Even if an old frontend sends auditors while
   * creating a plan, do not persist them here.
   */
  const {
    auditors: _ignoredAuditors,
    ...planningData
  } = data;

  const auditPlan = await AuditPlan.create({
    ...planningData,
    auditors: [],
    iqaNumber,
  });

  return await AuditPlan.findById(auditPlan._id);
};

export const updateAuditPlan = async (id, data) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  /*
   * Completed AuditPlans are historical records.
   */
  if (plan.status === "completed") {
    throw new AppError(
      "Completed audit plans cannot be edited.",
      400
    );
  }

  /*
   * Normal Audit Plan editing is allowed only while
   * the plan is pending/planned.
   *
   * Scheduled-audit changes are handled by
   * scheduledAuditService, which synchronizes the
   * master AuditPlan directly.
   */
  if (plan.status === "scheduled") {
    throw new AppError(
      "Scheduled audits must be edited from Scheduled Audits.",
      400
    );
  }

  /*
   * Auditors do not belong to planning.
   */
  const {
    auditors: _ignoredAuditors,
    status: _ignoredStatus,
    ...planningData
  } = data;

  Object.assign(plan, planningData);

  /*
   * A plan edited from Audit Plan remains pending.
   */
  plan.status = "pending";
  plan.auditors = [];

  await plan.save();

  return await AuditPlan.findById(plan._id);
};

export const deleteAuditPlan = async (id) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  if (plan.status === "scheduled") {
    throw new AppError(
      "A scheduled audit cannot be deleted from the audit lifecycle.",
      400
    );
  }

  if (plan.status === "completed") {
    throw new AppError(
      "A completed audit cannot be deleted from the audit lifecycle.",
      400
    );
  }

  await ScheduledAudit.deleteOne({
    auditPlan: plan._id,
  });

  await plan.deleteOne();

  return;
};

export const scheduleAuditPlan = async (id, scheduleData) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  if (plan.status === "completed") {
    throw new AppError(
      "Completed audits cannot be scheduled.",
      400
    );
  }

  if (plan.status === "scheduled") {
    throw new AppError(
      "This audit is already scheduled.",
      400
    );
  }

  /*
   * Coordinator was selected during planning.
   * Scheduling may receive it, but if it is omitted
   * we retain the coordinator already on AuditPlan.
   */
  if (scheduleData.auditCoordinator) {
    plan.auditCoordinator =
      scheduleData.auditCoordinator;
  }

  /*
   * Auditors are assigned during scheduling.
   */
  if (
    !Array.isArray(scheduleData.auditors) ||
    scheduleData.auditors.length === 0
  ) {
    throw new AppError(
      "Please select at least one auditor before scheduling.",
      400
    );
  }

  plan.auditors = scheduleData.auditors;

  /*
   * The scheduled start date becomes the current
   * operational audit date on the master AuditPlan.
   */
  const requestedStartDate =
    scheduleData.startDate ||
    scheduleData.auditPlannedDate ||
    plan.auditPlannedDate;

  const requestedEndDate =
    scheduleData.endDate ||
    requestedStartDate;

  const startDate =
    new Date(requestedStartDate);

  const endDate =
    new Date(requestedEndDate);

  if (Number.isNaN(startDate.getTime())) {
    throw new AppError(
      "Invalid Start Date.",
      400
    );
  }

  if (Number.isNaN(endDate.getTime())) {
    throw new AppError(
      "Invalid End Date.",
      400
    );
  }

  if (endDate < startDate) {
    throw new AppError(
      "End Date cannot be before Start Date.",
      400
    );
  }

  plan.auditPlannedDate = startDate;
  plan.status = "scheduled";

  await plan.save();

  let scheduledAudit =
    await ScheduledAudit.findOne({
      auditPlan: plan._id,
    });

  const scheduledAuditData = {
    auditPlan: plan._id,
    iqaNumber: plan.iqaNumber,
    prakalpa: plan.prakalpa,
    location: plan.location,
    sublocation: plan.sublocation,
    auditCoordinator: plan.auditCoordinator,
    prakalphaPramukh: plan.prakalphaPramukh,
    auditAreas: plan.auditAreas,
    purpose: plan.purpose || "",
    auditors: plan.auditors,
    finalAuditor:
      scheduleData.finalAuditor ||
      (plan.auditors.length > 0
        ? plan.auditors[0]
        : ""),
    startDate,
    endDate,
    status: "upcoming",
    mailSent: false,
  };

  if (scheduledAudit) {
    Object.assign(
      scheduledAudit,
      scheduledAuditData
    );

    await scheduledAudit.save();
  } else {
    scheduledAudit =
      new ScheduledAudit(
        scheduledAuditData
      );

    await scheduledAudit.save();
  }

  return await AuditPlan.findById(plan._id);
};

/*
 * Move scheduled → pending/planned.
 *
 * Scheduling-only information is removed by deleting
 * the linked ScheduledAudit.
 *
 * Coordinator remains on AuditPlan because it is a
 * planning-phase value.
 *
 * Auditors are cleared because they belong to the
 * scheduling phase.
 */
export const unscheduleAuditPlan = async (id) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit plan not found", 404);
  }

  if (plan.status === "completed") {
    throw new AppError(
      "Completed audits cannot be unscheduled.",
      400
    );
  }

  if (plan.status !== "scheduled") {
    throw new AppError(
      "Only scheduled audit plans can be unscheduled.",
      400
    );
  }

  await ScheduledAudit.deleteOne({
    auditPlan: plan._id,
  });

  plan.status = "pending";

  /*
   * Auditors must be selected again the next time
   * this plan is scheduled.
   */
  plan.auditors = [];

  await plan.save();

  return plan;
};
