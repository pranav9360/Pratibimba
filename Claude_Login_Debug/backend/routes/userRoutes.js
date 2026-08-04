import express from "express";

import authenticate from "../middleware/authMiddleware.js";
import authorize from "../middleware/authorize.js";

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";

import {
  createUserValidator,
  updateUserValidator,
} from "../validators/userValidator.js";

const router = express.Router();

router.get(
  "/",
  authenticate,
  authorize("admin"),
  getUsers
);

router.get(
  "/:id",
  authenticate,
  authorize("admin"),
  getUserById
);

router.post(
  "/",
  authenticate,
  authorize("admin"),
  createUserValidator,
  createUser
);

router.put(
  "/:id",
  authenticate,
  authorize("admin"),
  updateUserValidator,
  updateUser
);

router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  deleteUser
);

export default router;
