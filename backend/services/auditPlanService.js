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

  const auditPlan = await AuditPlan.create({
    ...data,
    iqaNumber,
  });

  return await AuditPlan.findById(auditPlan._id);
};

export const updateAuditPlan = async (id, data) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  Object.assign(plan, data);

  await plan.save();

  // Keep scheduled audit synchronized
  const scheduledAudit = await ScheduledAudit.findOne({
    auditPlan: plan._id,
  });

  if (scheduledAudit) {
    scheduledAudit.startDate = plan.auditPlannedDate;

    if (scheduledAudit.endDate < scheduledAudit.startDate) {
      scheduledAudit.endDate = plan.auditPlannedDate;
    }

    scheduledAudit.auditCoordinator = plan.auditCoordinator;
    scheduledAudit.auditors = plan.auditors;
    scheduledAudit.auditAreas = plan.auditAreas;
    scheduledAudit.purpose = plan.purpose || "";
    scheduledAudit.location = plan.location;
    scheduledAudit.sublocation = plan.sublocation;
    scheduledAudit.prakalphaPramukh = plan.prakalphaPramukh;

    await scheduledAudit.save();
  }

  return await AuditPlan.findById(plan._id);
};

export const deleteAuditPlan = async (id) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  // Only delete a plan that has not entered the audit lifecycle.
  // Once scheduled, the plan must remain as historical audit data.
  if (plan.status === "scheduled") {
    throw new AppError(
      "A scheduled audit cannot be deleted from the audit lifecycle.",
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

  if (scheduleData.auditPlannedDate) {
    plan.auditPlannedDate = scheduleData.auditPlannedDate;
  }

  if (scheduleData.auditCoordinator) {
    plan.auditCoordinator = scheduleData.auditCoordinator;
  }

  if (scheduleData.auditors) {
    plan.auditors = scheduleData.auditors;
  }

  plan.status = "scheduled";

  await plan.save();

  let scheduledAudit = await ScheduledAudit.findOne({
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
      plan.auditors.length > 0 ? plan.auditors[0] : "",
    startDate: plan.auditPlannedDate,
    endDate: plan.auditPlannedDate,
    mailSent: false,
  };

  if (scheduledAudit) {
    Object.assign(scheduledAudit, scheduledAuditData);
    await scheduledAudit.save();
  } else {
    scheduledAudit = new ScheduledAudit(scheduledAuditData);
    await scheduledAudit.save();
  }

  return await AuditPlan.findById(plan._id);
};

/*
 * Move an Audit Plan back from scheduled → pending/planned.
 *
 * The ScheduledAudit execution record is removed entirely,
 * so scheduling-only information such as:
 *   - start/end scheduling state
 *   - assigned scheduled auditors
 *   - mail dispatch state
 *   - completion state
 * disappears with that ScheduledAudit document.
 *
 * The AuditPlan remains as the master planning record.
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

  /*
   * Delete the linked execution/scheduling record.
   */
  await ScheduledAudit.deleteOne({
    auditPlan: plan._id,
  });

  /*
   * Return the master AuditPlan to planned/pending state.
   */
  plan.status = "pending";

  /*
   * Auditors are a scheduling-phase value.
   * Clear them when unscheduling.
   */
  plan.auditors = [];

  await plan.save();

  return plan;
};
