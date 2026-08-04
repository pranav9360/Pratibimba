import { body } from "express-validator";

export const createAuditPlanValidator = [

  body("domain")
    .trim()
    .notEmpty()
    .withMessage("Domain is required"),

  body("location")
    .trim()
    .notEmpty()
    .withMessage("Location is required"),

  body("auditPlannedDate")
    .notEmpty()
    .withMessage("Audit date is required"),

  body("auditCoordinator")
    .trim()
    .notEmpty()
    .withMessage("Audit Coordinator is required"),

  body("prakalphaPramukh")
    .trim()
    .notEmpty()
    .withMessage("Prakalpa Pramukh is required"),

  body("auditAreas")
    .isArray()
    .withMessage("Audit Areas must be an array"),

  body("auditors")
    .isArray()
    .withMessage("Auditors must be an array"),

  body("purpose")
    .optional()
    .trim(),

  body("status")
    .optional()
    .isIn([
      "pending",
      "scheduled",
    ]),

  body("domain")
    .optional()
    .trim(),

  body("sublocation")
    .optional()
    .trim(),

  body("prakalpa")
    .optional()
    .trim(),

];

export const updateAuditPlanValidator = [

  body("domain")
    .optional()
    .trim(),

  body("location")
    .optional()
    .trim(),

  body("sublocation")
    .optional()
    .trim(),

  body("prakalpa")
    .optional()
    .trim(),

  body("auditPlannedDate")
    .optional(),

  body("auditCoordinator")
    .optional()
    .trim(),

  body("prakalphaPramukh")
    .optional()
    .trim(),

  body("auditAreas")
    .optional()
    .isArray(),

  body("auditors")
    .optional()
    .isArray(),

  body("purpose")
    .optional()
    .trim(),

  body("status")
    .optional()
    .isIn([
      "pending",
      "scheduled",
    ]),

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
