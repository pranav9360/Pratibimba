import { Router } from 'express';
import authenticate from '../middleware/authMiddleware.js';
import authorize from '../middleware/authorize.js';
import { getZeroFindingStatus, submitZeroFindingDeclaration, decideZeroFindingDeclaration, downloadZeroFindingSummary, listCompletedZeroFindingSummaries, listZeroFindingStatuses } from '../controllers/zeroFindingController.js';

const router = Router();
router.get('/statuses', authenticate, authorize('auditor', 'audit_coordinator', 'admin', 'super_admin'), listZeroFindingStatuses);
router.get('/completed-summaries', authenticate,
  authorize('auditor', 'audit_coordinator', 'admin', 'super_admin'),
  listCompletedZeroFindingSummaries);
router.get('/scheduled-audits/:scheduledAuditId', authenticate,
  authorize('auditor', 'audit_coordinator', 'admin', 'super_admin'), getZeroFindingStatus);
router.post('/scheduled-audits/:scheduledAuditId/submit', authenticate,
  authorize('auditor'), submitZeroFindingDeclaration);
router.post('/scheduled-audits/:scheduledAuditId/decision', authenticate,
  authorize('audit_coordinator'), decideZeroFindingDeclaration);
router.get('/scheduled-audits/:scheduledAuditId/summary.pdf', authenticate,
  authorize('auditor', 'audit_coordinator', 'admin', 'super_admin'), downloadZeroFindingSummary);
export default router;
