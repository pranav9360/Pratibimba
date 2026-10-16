import mongoose from 'mongoose';
import ScheduledAudit from '../models/ScheduledAudit.js';
import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';
import AuditFinding from '../models/AuditFinding.js';
import AuditorSubmission from '../models/AuditorSubmission.js';
import Report from '../models/Report.js';
import LeadBatchSubmission from '../models/LeadBatchSubmission.js';
import CoordinatorBatchClosure from '../models/CoordinatorBatchClosure.js';
import ConsolidatedFinding from '../models/ConsolidatedFinding.js';
import AppError from '../utils/AppError.js';

// Legacy completed finding audits retain their existing entry rules. A pending
// or approved All Clear, however, must never acquire a new finding or report.
export async function acquireLegacyAuditWriteBarrier(id, session) {
  if (!session) throw new AppError('An audit transaction session is required.', 503);
  const audit = await ScheduledAudit.findById(id).session(session);
  if (!audit) throw new AppError('Scheduled Audit not found.', 404);
  await ScheduledAudit.updateOne({ _id: id }, { $inc: { workflowRevision: 1 } }, { session });
  if (await ZeroFindingDeclaration.exists({ scheduledAudit: id, status: { $in: ['submitted', 'approved'] } }).session(session)) {
    throw new AppError('All Clear is pending or approved. Return the declaration before changing the audit outcome.', 409);
  }
  return audit;
}

export async function withAuditWrite(id, callback) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => callback(await acquireLegacyAuditWriteBarrier(id, session), session));
  } finally { await session.endSession(); }
}

export async function assertAuditHistoryCanBeRemoved(audit, session) {
  if (audit.status === 'completed') throw new AppError('Completed audit history cannot be removed.', 409);
  for (const model of [ZeroFindingDeclaration, AuditFinding, AuditorSubmission, Report, LeadBatchSubmission, CoordinatorBatchClosure, ConsolidatedFinding]) {
    if (await model.exists({ scheduledAudit: audit._id }).session(session)) throw new AppError('Recorded audit work or declaration history prevents removal or unscheduling.', 409);
  }
}
