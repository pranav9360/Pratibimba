import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  createRoleValidator,
  updateRoleValidator,
} from "../validators/roleValidator.js";

import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("super_admin", "audit_coordinator", "auditor", "prakalpa_manager"),
  getRoles
);

router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "audit_coordinator", "auditor", "prakalpa_manager"),
  getRoleById
);

router.post(
  "/",
  authenticate,
  authorize("super_admin"),
  createRoleValidator,
  createRole
);

router.put(
  "/:id",
  authenticate,
  authorize("super_admin"),
  updateRoleValidator,
  updateRole
);

router.delete(
  "/:id",
  authenticate,
  authorize("super_admin"),
  deleteRole
);

export default router;