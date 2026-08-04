import ScheduledAudit from "../models/ScheduledAudit.js";
import AppError from "../utils/AppError.js";

export const getScheduledAudits = async () => {
  return await ScheduledAudit.find().sort({ createdAt: -1 });
};

export const getScheduledAuditById = async (id) => {
  const audit = await ScheduledAudit.findById(id);

  if (!audit) {
    throw new AppError("Scheduled Audit not found", 404);
  }

  return audit;
};

export const updateScheduledAudit = async (id, data) => {
  const audit = await ScheduledAudit.findById(id);

  if (!audit) {
    throw new AppError("Scheduled Audit not found", 404);
  }

  Object.assign(audit, data);

  await audit.save();

  return audit;
};

export const deleteScheduledAudit = async (id) => {
  const audit = await ScheduledAudit.findById(id);

  if (!audit) {
    throw new AppError("Scheduled Audit not found", 404);
  }

  await audit.deleteOne();

  return;
};