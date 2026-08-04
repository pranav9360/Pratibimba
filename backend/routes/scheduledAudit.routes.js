import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  getScheduledAudits,
  getScheduledAuditById,
  updateScheduledAudit,
  deleteScheduledAudit,
} from "../controllers/scheduledAuditController.js";

import {
  updateScheduledAuditValidator,
} from "../validators/scheduleAuditValidator.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  getScheduledAudits
);

router.get(
  "/:id",
  authenticate,
  getScheduledAuditById
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "lead_auditor"),
  updateScheduledAuditValidator,
  updateScheduledAudit
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "lead_auditor"),
  deleteScheduledAudit
);

export default router;