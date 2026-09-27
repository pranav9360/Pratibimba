import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  getLocations,
  getLocationsByPrakalpa,
  createLocation,
  updateLocation,
  deleteLocation,
} from "../controllers/locationController.js";

import {
  createLocationValidator,
  updateLocationValidator,
} from "../validators/locationValidator.js";

const router =
  express.Router();

router.get(
  "/",
  authenticate,
  getLocations
);

router.get(
  "/prakalpa/:prakalpa",
  authenticate,
  getLocationsByPrakalpa
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createLocationValidator,
  createLocation
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateLocationValidator,
  updateLocation
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteLocation
);

export default router;
