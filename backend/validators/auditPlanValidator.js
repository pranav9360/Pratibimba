import { body } from "express-validator";

export const createAuditPlanValidator = [
  body("prakalpa")
    .trim()
    .notEmpty()
    .withMessage(
      "Prakalpa is required"
    ),

  body("location")
    .trim()
    .notEmpty()
    .withMessage(
      "Location is required"
    ),

  body("auditPlannedDate")
    .notEmpty()
    .withMessage(
      "Audit date is required"
    ),

  body("auditCoordinator")
    .trim()
    .notEmpty()
    .withMessage(
      "Audit Coordinator is required"
    ),

  body("prakalphaPramukh")
    .trim()
    .notEmpty()
    .withMessage(
      "Prakalpa Pramukh is required"
    ),

  body("auditAreas")
    .isArray()
    .withMessage(
      "Audit Areas must be an array"
    ),

  /*
   * Auditors are NOT required during Audit Planning.
   *
   * Auditor assignment happens only when the audit
   * enters the scheduling phase.
   *
   * We still accept an auditors array if an older
   * client sends it, but planning does not require it.
   */
  body("auditors")
    .optional()
    .isArray()
    .withMessage(
      "Auditors must be an array"
    ),

  body("purpose")
    .optional()
    .trim(),

  body("sublocation")
    .optional()
    .trim(),

  body("status")
    .optional()
    .isIn([
      "pending",
      "scheduled",
      "completed",
    ]),
];

export const updateAuditPlanValidator = [
  body("prakalpa")
    .optional()
    .trim(),

  body("location")
    .optional()
    .trim(),

  body("sublocation")
    .optional()
    .trim(),

  body("auditPlannedDate")
    .optional(),

  /*
   * Coordinator is editable while the AuditPlan
   * is still in its planned/pending phase.
   *
   * Scheduled-audit coordinator edits are also
   * synchronized back to AuditPlan by the backend.
   */
  body("auditCoordinator")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Audit Coordinator cannot be empty"
    ),

  body("prakalphaPramukh")
    .optional()
    .trim(),

  body("auditAreas")
    .optional()
    .isArray(),

  /*
   * Kept here because AuditPlan remains the master
   * record for scheduled auditor assignments.
   *
   * The planning UI does not expose this field.
   */
  body("auditors")
    .optional()
    .isArray()
    .withMessage(
      "Auditors must be an array"
    ),

  body("purpose")
    .optional()
    .trim(),

  body("status")
    .optional()
    .isIn([
      "pending",
      "scheduled",
      "completed",
    ]),
];
