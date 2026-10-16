import { body } from "express-validator";

export const updateScheduledAuditValidator = [
  body("startDate")
    .optional()
    .isISO8601()
    .withMessage(
      "Start date must be a valid date."
    ),

  body("endDate")
    .optional()
    .isISO8601()
    .withMessage(
      "End date must be a valid date."
    ),

  /*
   * Auditors are a scheduling-phase field.
   * They can be assigned and edited while the
   * audit is scheduled.
   */
  body("auditors")
    .optional()
    .isArray()
    .withMessage(
      "Auditors must be an array."
    ),

  /*
   * Coordinator originates during planning but
   * remains editable while the audit is scheduled.
   *
   * The scheduled-audit backend service synchronizes
   * this value back into the linked AuditPlan.
   */
  body("auditCoordinator")
    .optional()
    .trim()
    .notEmpty()
    .withMessage(
      "Audit coordinator cannot be empty."
    ),

  body("status")
    .optional()
    .isIn([
      "upcoming",
      "ongoing",
      "completed",
    ])
    .withMessage(
      "Invalid scheduled audit status."
    ),
];
