import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  createReport,
  getReports,
  downloadReportPDF,
  getReportById,
  updateReport,
  sendReportEmail,
  sendIQAReportsEmail,
  sendReportToPrakalpa,
  submitPrakalpaCorrectiveAction,
  returnReportToPrakalpa,
  verifyAndCloseReport,
} from "../controllers/reportController.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  getReports
);

router.get(
  "/:id/pdf",
  authenticate,
  downloadReportPDF
);

// ===========================
// Send all IQR PDFs for an IQA
// ===========================

router.post(
  "/iqa/:iqaNumber/send-email",
  authenticate,
  sendIQAReportsEmail
);

router.get(
  "/:id",
  authenticate,
  getReportById
);

router.post(
  "/",
  authenticate,
  createReport
);


// ===========================
// Official IQR → Prakalpa
// ===========================

router.patch(
  "/:id/send-to-prakalpa",
  authenticate,
  authorize("audit_coordinator"),
  sendReportToPrakalpa
);


// ===========================
// Prakalpa corrective action
// ===========================

router.patch(
  "/:id/submit-action",
  authenticate,
  authorize("prakalpa_manager"),
  submitPrakalpaCorrectiveAction
);


// ===========================
// Coordinator verification
// ===========================

router.patch(
  "/:id/return-to-prakalpa",
  authenticate,
  authorize("audit_coordinator"),
  returnReportToPrakalpa
);

router.patch(
  "/:id/verify-close",
  authenticate,
  authorize("audit_coordinator"),
  verifyAndCloseReport
);


router.patch(
  "/:id",
  authenticate,
  updateReport
);

// ===========================
// Send Report Email
// ===========================

router.post(
  "/:id/send-email",
  authenticate,
  sendReportEmail
);

export default router;