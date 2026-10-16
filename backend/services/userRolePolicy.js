import AppError from "../utils/AppError.js";

export const USER_ROLES = new Set([
  "super_admin",
  "admin",
  "audit_coordinator",
  "auditor",
  "prakalpa_manager",
]);

export const assertSupportedRole = (role) => {
  if (!USER_ROLES.has(role)) {
    throw new AppError("Unsupported role", 400);
  }
};

export const assertLastActiveSuperAdminRemains = ({
  currentRole,
  currentActive,
  nextRole,
  nextActive,
  activeSuperAdminCount,
}) => {
  if (typeof currentActive !== "boolean" || typeof nextActive !== "boolean") {
    throw new AppError("Active must be a boolean", 400);
  }
  if (
    currentRole === "super_admin" &&
    currentActive &&
    (nextRole !== "super_admin" || !nextActive) &&
    activeSuperAdminCount <= 1
  ) {
    throw new AppError(
      "The last active Superadmin cannot be demoted or deactivated.",
      409
    );
  }
};
