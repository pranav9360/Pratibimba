import { body } from "express-validator";

export const updateScheduledAuditValidator = [

  body("startDate")
    .optional(),

  body("endDate")
    .optional(),

  body("auditors")
    .optional()
    .isArray(),

  body("finalAuditor")
    .optional()
    .trim(),

  body("mailSent")
    .optional()
    .isBoolean(),

];

export const scheduleAuditValidator = [

  body("startDate")
    .notEmpty()
    .withMessage("Start Date is required"),

  body("endDate")
    .notEmpty()
    .withMessage("End Date is required"),

  body("auditors")
    .isArray({ min: 1 })
    .withMessage("At least one auditor is required"),

  body("finalAuditor")
    .trim()
    .notEmpty()
    .withMessage("Final Auditor is required"),

];