import express from "express";
import { uploadFindingEvidence, downloadFindingEvidence, reviewFindingEvidence, removeDraftFindingEvidence, evidenceUpload } from "../controllers/findingEvidenceController.js";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  createAuditFinding,
  getAuditorBatchStatusController,
  submitAllAuditorFindingsController,
  listScheduledAuditFindings,
  editAuditFinding,
  submitDraftAuditFinding,
  submitAuditFindingToLead,
  getAuditFindings,
  getAuditFindingById,
  returnAuditFindingToAuditor,
  resubmitAuditFindingToLead,
  approveAuditFinding,
  getLeadBatchStatusController,
  submitLeadBatchController,
  editLeadFindingCopy,
  generateReportFromAuditFinding,
  getCoordinatorAuditFindingsController,
  getCoordinatorFindingSummariesController,
  reviewCoordinatorFindingController,
  completeCoordinatorFindingController,
  discardCoordinatorFindingController,
  generateCoordinatorBatchReportsController,
  listEligibleConsolidatedFindings,
  listScheduledAuditConsolidatedFindings,
  createConsolidatedFindingController,
  getConsolidatedFindingController,
  updateConsolidatedFindingController,
  submitConsolidatedFindingController,
  submitAllConsolidatedFindingsController,
  listCoordinatorConsolidatedInboxController,
  editCoordinatorConsolidatedFindingController,
  reviewCoordinatorConsolidatedClassificationController,
  generateReportFromConsolidatedFindingController,
} from "../controllers/auditFindingController.js";


const router = express.Router();
// Evidence is authenticated, finding-scoped and checked against current assignments.
router.post("/:id/evidence", authenticate, authorize("auditor"), evidenceUpload.single("file"), uploadFindingEvidence);
router.patch("/:id/evidence/:fileId/review", authenticate, authorize("auditor", "audit_coordinator"), reviewFindingEvidence);
router.delete("/:id/evidence/:fileId", authenticate, authorize("auditor"), removeDraftFindingEvidence);
router.get("/:id/evidence/:fileId", authenticate, authorize("auditor", "audit_coordinator", "admin", "super_admin"), downloadFindingEvidence);

router.get("/coordinator/finding-summaries",authenticate,authorize("audit_coordinator"),getCoordinatorFindingSummariesController);
router.get("/coordinator/audits/:scheduledAuditId/findings",authenticate,authorize("audit_coordinator"),getCoordinatorAuditFindingsController);
router.patch("/coordinator/findings/:id/review",authenticate,authorize("audit_coordinator"),reviewCoordinatorFindingController);
router.post("/coordinator/findings/:id/complete",authenticate,authorize("audit_coordinator"),completeCoordinatorFindingController);
router.post("/coordinator/findings/:id/discard",authenticate,authorize("audit_coordinator"),discardCoordinatorFindingController);
router.post("/coordinator/audits/:scheduledAuditId/generate-reports",authenticate,authorize("audit_coordinator"),generateCoordinatorBatchReportsController);

router.post(
  "/coordinator/consolidated-findings/:id/generate-report",
  authenticate,
  authorize("audit_coordinator"),
  generateReportFromConsolidatedFindingController
);

router.patch(
  "/coordinator/consolidated-findings/:id/details",
  authenticate,
  authorize("audit_coordinator"),
  editCoordinatorConsolidatedFindingController
);

router.patch(
  "/coordinator/consolidated-findings/:id/classification",
  authenticate,
  authorize("audit_coordinator"),
  reviewCoordinatorConsolidatedClassificationController
);

router.get(
  "/coordinator/consolidated-findings",
  authenticate,
  authorize("audit_coordinator"),
  listCoordinatorConsolidatedInboxController
);

router.get("/scheduled-audits/:scheduledAuditId/lead-batch", authenticate, authorize("auditor"), getLeadBatchStatusController);
router.post("/scheduled-audits/:scheduledAuditId/lead-batch/submit", authenticate, authorize("auditor"), submitLeadBatchController);

router.get("/scheduled-audits/:scheduledAuditId/auditor-batch", authenticate, authorize("auditor"), getAuditorBatchStatusController);
router.post("/scheduled-audits/:scheduledAuditId/auditor-batch/submit", authenticate, authorize("auditor"), submitAllAuditorFindingsController);

router.post(
  "/scheduled-audits/:scheduledAuditId/findings",
  authenticate,
  authorize("auditor"),
  createAuditFinding
);

router.get(
  "/scheduled-audits/:scheduledAuditId/findings",
  authenticate,
  authorize("auditor"),
  listScheduledAuditFindings
);

router.patch(
  "/scheduled-audits/:scheduledAuditId/findings/:findingId",
  authenticate,
  authorize("auditor"),
  editAuditFinding
);

router.post(
  "/scheduled-audits/:scheduledAuditId/findings/:findingId/submit",
  authenticate,
  authorize("auditor"),
  submitDraftAuditFinding
);

router.get(
  "/scheduled-audits/:scheduledAuditId/consolidated-findings/eligible",
  authenticate,
  authorize("auditor"),
  listEligibleConsolidatedFindings
);

router.get(
  "/scheduled-audits/:scheduledAuditId/consolidated-findings",
  authenticate,
  authorize("auditor"),
  listScheduledAuditConsolidatedFindings
);

router.get(
  "/scheduled/:scheduledAuditId/consolidated-findings",
  authenticate,
  authorize("auditor"),
  listScheduledAuditConsolidatedFindings
);

router.get(
  "/scheduled/:scheduledAuditId/consolidated-findings/eligible",
  authenticate,
  authorize("auditor"),
  listEligibleConsolidatedFindings
);

router.post(
  "/scheduled-audits/:scheduledAuditId/consolidated-findings",
  authenticate,
  authorize("auditor"),
  createConsolidatedFindingController
);

router.get(
  "/consolidated-findings/:id",
  authenticate,
  authorize("auditor"),
  getConsolidatedFindingController
);

router.patch(
  "/consolidated-findings/:id",
  authenticate,
  authorize("auditor"),
  updateConsolidatedFindingController
);

router.post(
  "/scheduled-audits/:scheduledAuditId/consolidated-findings/submit-all",
  authenticate,
  authorize("auditor"),
  submitAllConsolidatedFindingsController
);


router.post(
  "/",
  authenticate,
  authorize("auditor"),
  createAuditFinding
);

router.get(
  "/scheduled/:scheduledAuditId",
  authenticate,
  authorize("auditor"),
  listScheduledAuditFindings
);

router.patch(
  "/:id",
  authenticate,
  authorize("auditor"),
  editAuditFinding
);

router.post(
  "/:id/submit",
  authenticate,
  authorize("auditor"),
  submitDraftAuditFinding
);


/*
 * Secure finding inbox.
 *
 * Service-layer jurisdiction performs the authoritative
 * record-level access check.
 */
router.get(
  "/",
  authenticate,
  authorize(
    "super_admin",
    "admin",
    "audit_coordinator",
    "auditor"
  ),
  getAuditFindings
);


router.get(
  "/:id",
  authenticate,
  authorize(
    "super_admin",
    "admin",
    "audit_coordinator",
    "auditor"
  ),
  getAuditFindingById
);


router.post(
  "/submit-to-lead",
  authenticate,
  authorize("auditor"),
  submitAuditFindingToLead
);


/*
 * Lead Auditor returns a finding for correction.
 */
router.patch(
  "/:id/return-to-auditor",
  authenticate,
  authorize("auditor"),
  returnAuditFindingToAuditor
);


/*
 * Original Auditor corrects and resubmits a returned finding.
 */
router.patch(
  "/:id/resubmit-to-lead",
  authenticate,
  authorize("auditor"),
  resubmitAuditFindingToLead
);


/*
 * Lead approves and forwards the finding to the Coordinator.
 */
router.patch(
  "/:id/lead-edit",
  authenticate,
  authorize("auditor"),
  editLeadFindingCopy
);

router.patch(
  "/:id/approve",
  authenticate,
  authorize("auditor"),
  approveAuditFinding
);


/*
 * Assigned Audit Coordinator converts a Lead-approved finding
 * into its official IQR.
 */
router.post(
  "/:id/generate-report",
  authenticate,
  authorize("audit_coordinator"),
  generateReportFromAuditFinding
);


export default router;
