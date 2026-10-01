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
  authorize("super_admin", "admin"),
  getUsers
);

router.get(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  getUserById
);

router.post(
  "/",
  authenticate,
  authorize("super_admin", "admin"),
  createUserValidator,
  createUser
);

router.put(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  updateUserValidator,
  updateUser
);

router.delete(
  "/:id",
  authenticate,
  authorize("super_admin", "admin"),
  deleteUser
);

export default router;
