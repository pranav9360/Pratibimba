import express from "express";
import authenticate from "../middleware/authMiddleware.js";
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  verifyOtpRateLimiter,
  resetPasswordRateLimiter
} from "../middleware/authRateLimit.js";
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
  loginRateLimiter,
  loginValidator,
  login
);

router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  forgotPasswordValidator,
  forgotPassword
);

router.post(
  "/verify-otp",
  verifyOtpRateLimiter,
  otpValidator,
  verifyOtp
);

router.post(
  "/reset-password",
  resetPasswordRateLimiter,
  resetPasswordValidator,
  resetPassword
);
router.get(
  "/me",
  authenticate,
  me
);
export default router;
