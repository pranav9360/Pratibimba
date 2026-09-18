import express from "express";
import { authenticate } from "../middleware/auth.js";
import { sendScheduledAuditEmail } from "../controllers/scheduledAuditController.js";

const router = express.Router();

router.post("/:id/send-email", authenticate, sendScheduledAuditEmail);

export default router;
