import { verifyEmptyAudit } from '../services/zeroFindingWorkflowService.js';
import AppError from '../utils/AppError.js';
import mongoose from 'mongoose';
import ScheduledAudit from '../models/ScheduledAudit.js';
import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';

// Read-only status. Do not expose the declaration to unrelated accounts.
export async function getZeroFindingStatus(req, res, next) {
  try {
    const { scheduledAuditId } = req.params;
    if (!mongoose.isValidObjectId(scheduledAuditId)) {
      return res.status(400).json({ success: false, message: 'Invalid scheduled audit ID' });
    }
    const audit = await ScheduledAudit.findById(scheduledAuditId)
      .select('iqaNumber prakalpa startDate endDate leadAuditor auditCoordinator workflowMode status completedAt outcome').lean();
    if (!audit) return res.status(404).json({ success: false, message: 'Scheduled audit not found' });
    const user = req.user;
    const isAdmin = ['admin', 'super_admin'].includes(user.role);
    const isLead = user.role === 'auditor' && audit.leadAuditor?.trim() === user.name?.trim();
    const isCoordinator = user.role === 'audit_coordinator' && audit.auditCoordinator?.trim() === user.name?.trim();
    if (!isAdmin && !isLead && !isCoordinator) {
      return res.status(403).json({ success: false, message: 'Not authorized for this audit' });
    }
    const declaration = await ZeroFindingDeclaration.findOne({ scheduledAudit: audit._id })
      .select('leadAuditor coordinator workCompletedAt remark status coordinatorRemark approvedAt history createdAt updatedAt').lean();
    let eligibility = { eligible: false, reason: 'Only the assigned Lead Auditor may submit All Clear.' };
    if (isLead) {
      try {
        if (audit.status === 'completed') throw new AppError('Audit already completed.', 409);
        if (declaration && declaration.status !== 'returned') throw new AppError('All Clear has already been submitted.', 409);
        const end = audit.endDate ? new Date(audit.endDate).getTime() : NaN;
        if (!Number.isFinite(end) || Date.now() < end) throw new AppError('All Clear is available after the scheduled end date and time.', 409);
        if (!audit.auditCoordinator?.trim()) throw new AppError('An Audit Coordinator must be assigned.', 409);
        await verifyEmptyAudit(audit, null);
        eligibility = { eligible: true, reason: 'Every assigned Auditor has explicitly submitted zero findings.' };
      } catch (error) { if (!(error instanceof AppError)) throw error; eligibility.reason = error.message; }
    }
    return res.status(200).json({ success: true, data: { workflowMode: audit.workflowMode || 'legacy', audit, declaration, eligibility } });
  } catch (error) { next(error); }
}

import { submitZeroFinding, decideZeroFinding } from '../services/zeroFindingWorkflowService.js';
export async function submitZeroFindingDeclaration(req, res, next) {
  try { const data = await submitZeroFinding(req.params.scheduledAuditId, req.user, req.body);
    res.status(201).json({ success: true, data }); } catch (err) { next(err); }
}
export async function decideZeroFindingDeclaration(req, res, next) {
  try { const data = await decideZeroFinding(req.params.scheduledAuditId, req.user, req.body);
    res.status(200).json({ success: true, data }); } catch (err) { next(err); }
}

// Downloadable audit-level closure summary, distinct from finding-based IQRs.
export async function downloadZeroFindingSummary(req, res, next) {
  try {
    const { scheduledAuditId } = req.params;
    if (!mongoose.isValidObjectId(scheduledAuditId)) return res.status(400).json({ success: false, message: 'Invalid audit ID' });
    const audit = await ScheduledAudit.findById(scheduledAuditId).lean();
    if (!audit) return res.status(404).json({ success: false, message: 'Audit not found' });
    const user = req.user;
    const authorized = ['admin', 'super_admin'].includes(user.role) ||
      (user.role === 'auditor' && audit.leadAuditor?.trim() === user.name?.trim()) ||
      (user.role === 'audit_coordinator' && audit.auditCoordinator?.trim() === user.name?.trim());
    if (!authorized) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (audit.status !== 'completed') return res.status(409).json({ success: false, message: 'Audit is not completed' });
    const declaration = await ZeroFindingDeclaration.findOne({ scheduledAudit: audit._id, status: 'approved' }).lean();
    if (!declaration) return res.status(409).json({ success: false, message: 'No approved All Clear declaration' });
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({ margin: 54 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="all-clear-${String(audit._id)}.pdf"`);
    doc.pipe(res);
    doc.fontSize(18).text('Internal Quality Audit - No Negative Findings', { align: 'center' });
    doc.moveDown().fontSize(11);
    for (const [label, value] of [
      ['IQA Number', audit.iqaNumber], ['Prakalpa', audit.prakalpa],
      ['Location', audit.location], ['Lead Auditor', audit.leadAuditor],
      ['Audit Coordinator', audit.auditCoordinator], ['Audit Status', audit.status],
      ['NC Count', '0'], ['OFI Count', '0'],
      ['Approved At', declaration.approvedAt?.toISOString?.() || ''],
    ]) doc.text(`${label}: ${String(value ?? '')}`);
    doc.moveDown().fontSize(13).text('Lead Auditor Declaration');
    doc.fontSize(11).text(declaration.remark);
    if (declaration.coordinatorRemark) {
      doc.moveDown().fontSize(13).text('Coordinator Remark');
      doc.fontSize(11).text(declaration.coordinatorRemark);
    }
    doc.moveDown().fontSize(9).text('Audit-level closure summary. No NC/OFI finding or IQR has been fabricated.');
    doc.end();
  } catch (err) { next(err); }
}

// Completed All Clear summaries are separate from finding-based IQRs.
// Use the same lead/coordinator/admin authorization as the PDF endpoint.
export async function listCompletedZeroFindingSummaries(req, res, next) {
  try {
    const user = req.user;
    const filter = { status: 'completed' };

    if (['admin', 'super_admin'].includes(user.role)) {
      // Administrators may view completed audits.
    } else if (user.role === 'audit_coordinator' && user.name?.trim()) {
      filter.auditCoordinator = user.name.trim();
    } else if (user.role === 'auditor' && user.name?.trim()) {
      filter.leadAuditor = user.name.trim();
    } else {
      return res.status(403).json({
        success: false, message: 'Not authorized'
      });
    }

    const audits = await ScheduledAudit.find(filter)
      .select('_id iqaNumber prakalpa location leadAuditor auditCoordinator endDate')
      .lean();

    if (!audits.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const declarations = await ZeroFindingDeclaration.find({
      scheduledAudit: { $in: audits.map(audit => audit._id) },
      status: 'approved',
    }).select('scheduledAudit approvedAt').lean();

    const approved = new Map(
      declarations.map(item => [String(item.scheduledAudit), item])
    );

    const data = audits
      .filter(audit => approved.has(String(audit._id)))
      .map(audit => ({
        ...audit,
        approvedAt: approved.get(String(audit._id)).approvedAt,
      }))
      .sort((a, b) =>
        new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0)
      );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// One scoped read for table badges, with no polling or per-row requests.
export async function listZeroFindingStatuses(req, res, next) {
  try {
    const user = req.user;
    const filter = ['admin', 'super_admin'].includes(user.role) ? {} :
      user.role === 'audit_coordinator' ? { auditCoordinator: user.name?.trim() || null } :
      { leadAuditor: user.name?.trim() || null };
    const audits = await ScheduledAudit.find(filter).select('_id').lean();
    const records = await ZeroFindingDeclaration.find({ scheduledAudit: { $in: audits.map(a => a._id) } }).select('scheduledAudit status').lean();
    res.status(200).json({ success: true, data: Object.fromEntries(records.map(r => [String(r.scheduledAudit), r.status])) });
  } catch (error) { next(error); }
}
