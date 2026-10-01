import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  submitAuditFinding,
  getAuditFindings,
  getAuditFindingById,
  returnAuditFindingToAuditor,
  resubmitAuditFindingToLead,
  approveAuditFinding,
  generateReportFromAuditFinding,
} from "../controllers/auditFindingController.js";


const router = express.Router();


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
    "lead_auditor",
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
    "lead_auditor",
    "audit_coordinator",
    "auditor"
  ),
  getAuditFindingById
);


router.post(
  "/submit-to-lead",
  authenticate,
  authorize("auditor"),
  submitAuditFinding
);


/*
 * Lead Auditor returns a finding for correction.
 */
router.patch(
  "/:id/return-to-auditor",
  authenticate,
  authorize("lead_auditor"),
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
  "/:id/approve",
  authenticate,
  authorize("lead_auditor"),
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
