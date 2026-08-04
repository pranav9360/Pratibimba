import AuditPlan from "../models/AuditPlan.js";
import AppError from "../utils/AppError.js";
import ScheduledAudit from "../models/ScheduledAudit.js";

export const getAuditPlans = async () => {
  return await AuditPlan.find().sort({ createdAt: -1 });
};

export const getAuditPlanById = async (id) => {
  const plan = await AuditPlan.findById(id);
  console.log("========== SCHEDULE API ==========");
  console.log("Plan ID:", id);
  console.log("Body:", scheduleData);
  console.log("Plan Found:", !!plan);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  return plan;
};

export const createAuditPlan = async (data) => {
  const currentYear = new Date().getFullYear();

  // Find all audit plans for the current year
  const plans = await AuditPlan.find(
    {
      iqaNumber: new RegExp(`^IQA-${currentYear}-`)
    },
    "iqaNumber"
  );

  let maxNumber = 0;

  for (const plan of plans) {
    if (!plan.iqaNumber) continue;

    const match = plan.iqaNumber.match(
      new RegExp(`^IQA-${currentYear}-(\\d{4})$`)
    );

    if (match) {
      const num = parseInt(match[1], 10);

      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumber = maxNumber + 1;

  const iqaNumber = `IQA-${currentYear}-${String(nextNumber).padStart(4, "0")}`;

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

  return await AuditPlan.findById(plan._id);
};

export const deleteAuditPlan = async (id) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  await plan.deleteOne();

  return;
};

export const scheduleAuditPlan = async (id, scheduleData) => {
  const plan = await AuditPlan.findById(id);

  if (!plan) {
    throw new AppError("Audit Plan not found", 404);
  }

  plan.status = "scheduled";

  if (scheduleData.auditPlannedDate) {
    plan.auditPlannedDate = scheduleData.auditPlannedDate;
  }

  if (scheduleData.auditCoordinator) {
    plan.auditCoordinator = scheduleData.auditCoordinator;
  }

  if (scheduleData.auditors) {
    plan.auditors = scheduleData.auditors;
  }

  await plan.save();

  const payload = {
    auditPlanId: plan._id,
    iqaNumber: plan.iqaNumber,
    domain: plan.domain,
    location: plan.location,
    sublocation: plan.sublocation,
    prakalpa: plan.prakalpa,
    purpose: plan.purpose,
    auditCoordinator: plan.auditCoordinator,
    prakalphaPramukh: plan.prakalphaPramukh,
    auditAreas: plan.auditAreas,
    auditPlannedDate: plan.auditPlannedDate,
    startDate: scheduleData.startDate,
    endDate: scheduleData.endDate,
    auditors: scheduleData.auditors,
    finalAuditor: scheduleData.finalAuditor,
    mailSent: true,
  };

  const existing = await ScheduledAudit.findOne({
    auditPlanId: plan._id,
  });

  let scheduledAudit;

  if (existing) {
    Object.assign(existing, payload);
    scheduledAudit = await existing.save();
  } else {
    scheduledAudit = await ScheduledAudit.create(payload);
  }

  return {
    auditPlan: plan,
    scheduledAudit,
  };
};