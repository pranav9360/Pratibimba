import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  getAuditPlans,
  getAuditPlanById,
  createAuditPlan,
  updateAuditPlan,
  deleteAuditPlan,
  scheduleAuditPlan,
} from "../controllers/auditPlanController.js";

import {
  createAuditPlanValidator,
  updateAuditPlanValidator,
  scheduleAuditValidator,
} from "../validators/auditPlanValidator.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  getAuditPlans
);

router.get(
  "/:id",
  authenticate,
  getAuditPlanById
);

router.post(
  "/",
  authenticate,
  authorize("admin", "lead_auditor"),
  createAuditPlanValidator,
  createAuditPlan
);

router.put(
  "/:id",
  authenticate,
  authorize("admin", "lead_auditor"),
  updateAuditPlanValidator,
  updateAuditPlan
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin", "lead_auditor"),
  deleteAuditPlan
);

router.put(
  "/:id/schedule",
  authenticate,
  authorize("admin", "lead_auditor"),
  scheduleAuditValidator,
  scheduleAuditPlan
);

export default router;
