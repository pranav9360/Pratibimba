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
  authorize("admin"),
  createPrakalpaValidator,
  createPrakalpa
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updatePrakalpaValidator,
  updatePrakalpa
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deletePrakalpa
);

export default router;
