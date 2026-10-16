import { body } from "express-validator";

const PERMISSION_KEYS = new Set([
  "canCreateAuditPlan",
  "canScheduleAudit",
  "canEditReport",
  "canCloseReport",
  "canViewAllReports",
  "canManageRoles",
  "canManageUsers",
  "canViewDashboard",
  "canAddAuditor",
  "canAssignAuditCoordinator",
  "canAssignAuditors",
  "canAssignLeadAuditor",
  "canSubmitFindings",
  "canReviewFindings",
  "canSubmitFindingsToCoordinator",
  "canGenerateReport",
  "canSendReportToPrakalpa",
  "canSubmitCorrectiveAction",
  "canVerifyCorrectiveAction",
  "canManagePrakalpas",
  "canManageAdmins",
]);

const validatePermissions = (permissions) =>
  permissions &&
  typeof permissions === "object" &&
  !Array.isArray(permissions) &&
  Object.entries(permissions).every(
    ([permission, enabled]) =>
      PERMISSION_KEYS.has(permission) && typeof enabled === "boolean"
  );

export const createRoleValidator = [
  body("name")
    .isString().bail()
    .trim()
    .matches(/^[a-z][a-z0-9_]*$/)
    .withMessage("Role name must use lowercase letters, numbers, and underscores")
    .notEmpty()
    .withMessage("Role name is required"),

  body("permissions")
    .optional()
    .custom(validatePermissions)
    .withMessage("Role permissions must contain supported boolean values"),
];

export const updateRoleValidator = [
  body("name")
    .optional()
    .isString().bail()
    .trim()
    .matches(/^[a-z][a-z0-9_]*$/)
    .notEmpty()
    .withMessage("Role name cannot be empty"),

  body("permissions")
    .optional()
    .custom(validatePermissions)
    .withMessage("Role permissions must contain supported boolean values"),

  body("active")
    .optional()
    .custom((value) => typeof value === "boolean")
    .withMessage("Active must be a boolean"),
];
