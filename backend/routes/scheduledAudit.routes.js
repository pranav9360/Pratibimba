import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  getScheduledAudits,
  getScheduledAuditById,
  updateScheduledAudit,
  completeScheduledAudit,
  deleteScheduledAudit,
  markMailSent,
  sendScheduledAuditEmail,
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
  authorize(
    "admin",
    "lead_auditor"
  ),
  updateScheduledAuditValidator,
  updateScheduledAudit
);

/*
 * Explicit completion action.
 */
router.patch(
  "/:id/complete",
  authenticate,
  authorize(
    "admin",
    "lead_auditor"
  ),
  completeScheduledAudit
);

router.post(
  "/:id/send-email",
  authenticate,
  authorize(
    "admin",
    "lead_auditor"
  ),
  sendScheduledAuditEmail
);

router.patch(
  "/:id/mail-sent",
  authenticate,
  authorize(
    "admin",
    "lead_auditor"
  ),
  markMailSent
);

router.delete(
  "/:id",
  authenticate,
  authorize(
    "admin",
    "lead_auditor"
  ),
  deleteScheduledAudit
);

export default router;
