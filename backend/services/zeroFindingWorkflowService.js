import mongoose from 'mongoose';
import ConsolidatedFindingSourceClaim from '../models/ConsolidatedFindingSourceClaim.js';
import ScheduledAudit from '../models/ScheduledAudit.js';
import AuditFinding from '../models/AuditFinding.js';
import ConsolidatedFinding from '../models/ConsolidatedFinding.js';
import AuditorSubmission from '../models/AuditorSubmission.js';
import LeadBatchSubmission from '../models/LeadBatchSubmission.js';
import CoordinatorBatchClosure from '../models/CoordinatorBatchClosure.js';
import Report from '../models/Report.js';
import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';
import { acquireConsolidatedAuditWriteBarrier } from './consolidatedAuditWriteBarrier.js';
import { normalizeZeroFindingRemark } from './zeroFindingPolicy.js';
import AppError from '../utils/AppError.js';

const norm = value => String(value ?? '').trim();
const reject = (message, code = 409) => { throw new AppError(message, code); };
const checkId = id => { if (!mongoose.isValidObjectId(id)) reject('Invalid Scheduled Audit ID.', 400); };
const verifyAssignment = (audit, user, role) => {
  if (user?.role !== role || !norm(user.name) ||
    norm(role === 'auditor' ? audit.leadAuditor : audit.auditCoordinator) !== norm(user.name))
    reject('This audit is outside your assigned role.', 403);
};

export async function verifyEmptyAudit(audit, session) {
  const filter = { scheduledAudit: audit._id };
  // Do not execute concurrent operations inside one MongoDB transaction.
  const raw = await AuditFinding.countDocuments(filter).session(session);
  const consolidated = await ConsolidatedFinding.countDocuments(filter).session(session);
  const handovers = await LeadBatchSubmission.countDocuments(filter).session(session);
  const closures = await CoordinatorBatchClosure.countDocuments(filter).session(session);
  const reports = await Report.countDocuments(filter).session(session);
  const claims = await ConsolidatedFindingSourceClaim.countDocuments(filter).session(session);
  if (raw || consolidated || handovers || closures || reports || claims) {
    reject('Recorded findings, handovers, reports, or prior closure prevent All Clear.');
  }
  const expected = [...new Set((audit.auditors || []).map(norm).filter(Boolean))];
  if (!expected.length) reject("At least one assigned Auditor must submit an explicit zero-finding response.");
  const submissions = await AuditorSubmission.find(filter).select('auditorName findingCount').session(session).lean();
  if (submissions.length !== expected.length ||
    submissions.some(s => s.findingCount !== 0 || !expected.includes(norm(s.auditorName))) ||
    new Set(submissions.map(s => norm(s.auditorName))).size !== expected.length) {
    reject('Every assigned Auditor must explicitly submit a zero-finding response.');
  }
}

async function transact(fn) {
  const session = await mongoose.startSession();
  try { return await session.withTransaction(() => fn(session)); }
  finally { await session.endSession(); }
}

export async function submitZeroFinding(scheduledAuditId, user, payload) {
  checkId(scheduledAuditId);
  let remark;
  try { remark = normalizeZeroFindingRemark(payload?.remark); } catch { reject('A declaration remark of 1–4000 characters is required.', 400); }
  if (payload?.workCompleted !== true) reject('Confirm that audit work is completed before submitting All Clear.', 400);
  return transact(async session => {
    const audit = await acquireConsolidatedAuditWriteBarrier(scheduledAuditId, session, { allowAllClear: true, allowLegacy: true });
    verifyAssignment(audit, user, 'auditor');
    const end = audit.endDate ? new Date(audit.endDate).getTime() : NaN;
    if (!Number.isFinite(end) || Date.now() < end) reject('All Clear is available only after the scheduled end date and time.');
    if (!norm(audit.auditCoordinator)) reject('An Audit Coordinator must be assigned.');
    const existing = await ZeroFindingDeclaration.findOne({ scheduledAudit: audit._id }).session(session);
    if (existing && existing.status !== 'returned') reject('All Clear has already been submitted.');
    await verifyEmptyAudit(audit, session);
    const now = new Date();
    if (existing) {
      existing.leadAuditor = user._id;
      existing.status = 'submitted';
      existing.workCompletedAt = new Date();
      existing.remark = remark;
      existing.coordinator = null;
      existing.coordinatorRemark = '';
      existing.approvedAt = null;
      existing.history.push({ action: 'submitted', by: user._id, name: norm(user.name), role: user.role, remark, at: now });
      await existing.save({ session });
      return existing;
    }
    const [record] = await ZeroFindingDeclaration.create([{
      scheduledAudit: audit._id, leadAuditor: user._id, remark, workCompletedAt: now,
      status: 'submitted', history: [{ action: 'submitted', by: user._id, name: norm(user.name), role: user.role, remark, at: now }],
    }], { session });
    return record;
  });
}

export async function decideZeroFinding(scheduledAuditId, user, payload) {
  checkId(scheduledAuditId);
  const decision = payload?.decision;
  if (!['approve', 'return'].includes(decision)) reject('Decision must be approve or return.', 400);
  let remark;
  try { remark = decision === 'return' ? normalizeZeroFindingRemark(payload?.remark)
    : typeof payload?.remark === 'string' ? payload.remark.trim() : ''; }
  catch { reject('A return remark of 1–4000 characters is required.', 400); }
  if (remark.length > 4000) reject('Remark is too long.', 400);
  return transact(async session => {
    const audit = await acquireConsolidatedAuditWriteBarrier(scheduledAuditId, session, { allowAllClear: true, allowLegacy: true });
    verifyAssignment(audit, user, 'audit_coordinator');
    const declaration = await ZeroFindingDeclaration.findOne({ scheduledAudit: audit._id }).session(session);
    if (!declaration || declaration.status !== 'submitted') reject('No pending All Clear declaration.');
    if (decision === 'approve') {
      if (String(declaration.leadAuditor) === String(user._id)) reject('The declaration author cannot approve their own All Clear.', 403);
      if (!declaration.workCompletedAt) reject('Return this declaration for the Lead Auditor to confirm completed audit work.');
      const end = audit.endDate ? new Date(audit.endDate).getTime() : NaN;
      if (!Number.isFinite(end) || Date.now() < end) reject('Approval is available only after the scheduled end date and time.');
      await verifyEmptyAudit(audit, session);
    }
    const now = new Date();
    declaration.status = decision === 'approve' ? 'approved' : 'returned';
    declaration.coordinator = user._id;
    declaration.coordinatorRemark = remark;
    declaration.approvedAt = decision === 'approve' ? now : null;
    declaration.history.push({ action: declaration.status, by: user._id, name: norm(user.name), role: user.role, remark, at: now });
    await declaration.save({ session });
    return declaration;
  });
}

// Recheck the full inventory under the completion transaction; no report is fabricated.
export async function verifyApprovedZeroFindingAtClosure(audit, session) {
  const declaration = await ZeroFindingDeclaration.findOne({ scheduledAudit: audit._id }).session(session);
  if (!declaration || declaration.status !== 'approved') reject('An approved All Clear declaration is required.');
  await verifyEmptyAudit(audit, session);
  return declaration;
}
