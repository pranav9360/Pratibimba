import { rateLimit } from "express-rate-limit";

const createAuthLimiter = ({
  windowMs,
  limit,
  message
}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,

    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message
      });
    }
  });

export const loginRateLimiter = createAuthLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message:
    "Too many login attempts. Please try again later."
});

export const forgotPasswordRateLimiter =
  createAuthLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message:
      "Too many password reset requests. Please try again later."
  });

export const verifyOtpRateLimiter =
  createAuthLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    message:
      "Too many OTP verification attempts. Please try again later."
  });

export const resetPasswordRateLimiter =
  createAuthLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    message:
      "Too many password reset attempts. Please try again later."
  });
