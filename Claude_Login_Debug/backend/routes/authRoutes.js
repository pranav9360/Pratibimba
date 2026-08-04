import express from "express";
import authenticate from "../middleware/authMiddleware.js";
import {
  login,
  forgotPassword,
  verifyOtp,
  resetPassword,
  me
} from "../controllers/authController.js";

import {
  loginValidator,
  forgotPasswordValidator,
  otpValidator,
  resetPasswordValidator
} from "../validators/authValidator.js";

const router = express.Router();

router.post(
  "/login",
  loginValidator,
  login
);

router.post(
  "/forgot-password",
  forgotPasswordValidator,
  forgotPassword
);

router.post(
  "/verify-otp",
  otpValidator,
  verifyOtp
);

router.post(
  "/reset-password",
  resetPasswordValidator,
  resetPassword
);
router.get(
  "/me",
  authenticate,
  me
);
export default router;
