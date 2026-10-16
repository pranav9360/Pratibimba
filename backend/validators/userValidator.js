import { isValidNewPassword, PASSWORD_POLICY_MESSAGE } from "../../shared/password-policy.mjs";
import { body } from "express-validator";

const USER_ROLES = [
  "super_admin",
  "admin",
  "audit_coordinator",
  "auditor",
  "prakalpa_manager",
];

export const createUserValidator = [
  body("name")
    .isString().bail()
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .isString().bail()
    .trim()
    .isEmail()
    .withMessage("Valid email is required"),

  body("password")
    .isString().bail()
    .custom(isValidNewPassword)
    .withMessage(PASSWORD_POLICY_MESSAGE),

  body("role")
    .isString().bail()
    .isIn([
      "admin",
      "audit_coordinator",
      "auditor",
      "prakalpa_manager",
    ])
    .withMessage("Invalid role"),

  body("phone")
    .optional()
    .isString().bail()
    .trim(),

  body("prakalpa")
    .optional()
    .isString().bail()
    .trim(),

  body("assignedPrakalpas")
    .optional()
    .isArray(),

  body("active")
    .optional()
    .custom((value) => typeof value === "boolean")
    .withMessage("Active must be a boolean"),
];

export const updateUserValidator = [
  body("name").optional().isString().bail().trim().notEmpty(),

  body("password").optional().isString().bail()
    .custom((value) => value === "" || isValidNewPassword(value))
    .withMessage(PASSWORD_POLICY_MESSAGE),

  body("email")
    .optional()
    .isString().bail()
    .isEmail(),

  body("role")
    .optional()
    .isString().bail()
    .isIn(USER_ROLES),

  body("phone")
    .optional()
    .isString().bail()
    .trim(),

  body("prakalpa")
    .optional()
    .isString().bail()
    .trim(),

  body("assignedPrakalpas")
    .optional()
    .isArray(),

  body("active")
    .optional()
    .custom((value) => typeof value === "boolean")
    .withMessage("Active must be a boolean"),
];

export const changeUserRoleValidator = [
  body("role")
    .isString().bail()
    .isIn(USER_ROLES)
    .withMessage("Unsupported role"),
];
