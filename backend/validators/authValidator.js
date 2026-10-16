import { isValidNewPassword, PASSWORD_POLICY_MESSAGE } from "../../shared/password-policy.mjs";
import { body } from "express-validator";

export const loginValidator = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or Mobile Number is required"),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

export const forgotPasswordValidator = [
  body("identifier")
    .trim()
    .notEmpty()
    .withMessage("Email or Mobile Number is required"),
];

export const otpValidator = [
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits"),
];

export const resetPasswordValidator = [
  body("password")
    .custom(isValidNewPassword)
    .withMessage(PASSWORD_POLICY_MESSAGE),

  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    return true;
  }),
];
