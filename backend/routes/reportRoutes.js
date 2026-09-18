import express from "express";

import authenticate from "../middleware/authMiddleware.js";

import {
  createReport,
  getReports,
  downloadReportPDF,
  getReportById,
  closeReport,
  updateReport,
  sendReportEmail,
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
// Close Report
// ===========================

router.patch(
  "/:id/close",
  authenticate,
  closeReport
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