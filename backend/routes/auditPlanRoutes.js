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
  unscheduleAuditPlan,
} from "../controllers/auditPlanController.js";

import {
  createAuditPlanValidator,
  updateAuditPlanValidator,
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
  authorize("super_admin", "admin"),
  createAuditPlanValidator,
  createAuditPlan
);

router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  updateAuditPlanValidator,
  updateAuditPlan
);

router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  deleteAuditPlan
);

router.put(
  "/:id/schedule",
  authenticate,
  authorize(
    "admin",
    "audit_coordinator"
  ),
  scheduleAuditPlan
);


router.patch(
  "/:id/unschedule",
  authenticate,
  authorize(
    "admin",
    "audit_coordinator"
  ),
  unscheduleAuditPlan
);

export default router;
