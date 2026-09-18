import { body } from "express-validator";

export const createUserValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required"),

  body("email")
    .trim()
    .isEmail()
    .withMessage("Valid email is required"),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("role")
    .isIn([
      "admin",
      "lead_auditor",
      "audit_coordinator",
      "auditor",
      "prakalpa_manager",
    ])
    .withMessage("Invalid role"),

  body("phone")
    .optional()
    .trim(),

  body("prakalpa")
    .optional()
    .trim(),

  body("assignedPrakalpas")
    .optional()
    .isArray(),

  body("active")
    .optional()
    .isBoolean(),
];

export const updateUserValidator = [
  body("name").optional().trim(),

  body("email")
    .optional()
    .isEmail(),

  body("role")
    .optional()
    .isIn([
      "admin",
      "lead_auditor",
      "audit_coordinator",
      "auditor",
      "prakalpa_manager",
    ]),

  body("phone")
    .optional()
    .trim(),

  body("prakalpa")
    .optional()
    .trim(),

  body("assignedPrakalpas")
    .optional()
    .isArray(),

  body("active")
    .optional()
    .isBoolean(),
];
