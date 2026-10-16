import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  getDomains,
  createDomain,
  updateDomain,
  deleteDomain,
} from "../controllers/domainController.js";

import {
  createDomainValidator,
  updateDomainValidator,
} from "../validators/domainValidator.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  getDomains
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createDomainValidator,
  createDomain
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateDomainValidator,
  updateDomain
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteDomain
);

export default router;
