import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  getPrakalpas,
  createPrakalpa,
  updatePrakalpa,
  deletePrakalpa,
} from "../controllers/prakalpaController.js";

import {
  createPrakalpaValidator,
  updatePrakalpaValidator,
} from "../validators/prakalpaValidator.js";

const router =
  express.Router();

router.get(
  "/",
  authenticate,
  getPrakalpas
);

router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  createPrakalpaValidator,
  createPrakalpa
);

router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  updatePrakalpaValidator,
  updatePrakalpa
);

router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  deletePrakalpa
);

export default router;
