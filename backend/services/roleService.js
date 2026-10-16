import Role from "../models/Role.js";
import AppError from "../utils/AppError.js";
import { withAdministrativeMutation } from "./administrativeMutation.js";
import { recordActivity } from "./activityLogService.js";

const BUILT_IN_ROLES = new Set([
  "super_admin",
  "admin",
  "audit_coordinator",
  "auditor",
  "prakalpa_manager",
]);

const ADMINISTRATIVE_PERMISSIONS = new Set([
  "canManageRoles",
  "canManageUsers",
  "canManageAdmins",
  "canManagePrakalpas",
  "canViewAllReports",
]);

export const getRoles = async ({ includeInactive = false } = {}, actor) => {
  if (includeInactive && (actor?.active !== true || actor.role !== "super_admin")) {
    throw new AppError("Only Superadmins can list inactive role definitions.", 403);
  }
  return Role.find(includeInactive ? {} : { active: true }).sort({ name: 1 });
};

const roleSnapshot = (role) => ({ name: role.name, active: role.active,
  permissions: role.permissions?.toObject?.() ?? { ...role.permissions } });
const logRoleChange = (role, actor, action, before, session) => recordActivity({
  actor, target: { entityType: "role", roleId: role._id, name: role.name },
  action, oldValue: before, newValue: roleSnapshot(role), session,
});
const validateRoleData = (data, creating = false) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new AppError("Invalid role data", 400);
  const allowed = creating ? ["name", "permissions"] : ["name", "permissions", "active"];
  if (Object.keys(data).some((key) => !allowed.includes(key))) {
    throw new AppError("Unsupported role field", 400);
  }
  if ((creating || data.name !== undefined) &&
      (typeof data.name !== "string" || !/^[a-z][a-z0-9_]*$/.test(data.name))) {
    throw new AppError("Invalid role name", 400);
  }
  if (data.active !== undefined && typeof data.active !== "boolean") {
    throw new AppError("Active must be a boolean", 400);
  }
};

export const getRoleById = async (id) => {
  const role = await Role.findById(id);

  if (!role) {
    throw new AppError("Role not found", 404);
  }

  return role;
};

const assertSafePermissions = (roleName, permissions = {}, existing = {}) => {
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions)) {
    throw new AppError("Invalid role permissions", 400);
  }
  for (const [permission, enabled] of Object.entries(permissions)) {
    if (!Role.schema.path("permissions").schema.path(permission) || typeof enabled !== "boolean") {
      throw new AppError("Role permissions must contain supported boolean values", 400);
    }
    if (
      enabled && existing[permission] !== true &&
      ADMINISTRATIVE_PERMISSIONS.has(permission) &&
      roleName !== "admin" &&
      roleName !== "super_admin"
    ) {
      throw new AppError(
        `Administrative permission ${permission} is reserved for Admin and Superadmin roles.`,
        403
      );
    }

    if (enabled && existing[permission] !== true && permission === "canManageAdmins" && roleName !== "super_admin") {
      throw new AppError(
        "Only the Superadmin role can manage administrator accounts.",
        403
      );
    }
  }
};

export const createRole = async (data, currentUser) => {
  validateRoleData(data, true);
  return withAdministrativeMutation(currentUser, async (actor, session) => {
    const name = data.name.toLowerCase();

    if (BUILT_IN_ROLES.has(name)) {
      throw new AppError("Built-in roles cannot be recreated.", 409);
    }

    const existing = await Role.findOne({ name }).session(session);
    if (existing) {
      throw new AppError("Role already exists", 409);
    }

    assertSafePermissions(name, data.permissions);
    const [role] = await Role.create([{ name, permissions: data.permissions ?? {} }], { session });
    await logRoleChange(role, actor, "role_created", {}, session);
    return role;
  });
};

export const updateRole = async (id, data, currentUser) => {
  validateRoleData(data);
  return withAdministrativeMutation(currentUser, async (actor, session) => {
    const role = await Role.findById(id).session(session);

    if (!role) {
      throw new AppError("Role not found", 404);
    }

    const isBuiltInRole = BUILT_IN_ROLES.has(role.name);

    if (role.name === "super_admin" && actor.role !== "super_admin") {
      throw new AppError("Only a Superadmin can modify the Superadmin role.", 403);
    }

    if (isBuiltInRole && data.name && data.name !== role.name) {
      throw new AppError("Built-in role names cannot be changed.", 403);
    }

    if (isBuiltInRole && data.active === false) {
      throw new AppError("Built-in roles cannot be deactivated.", 409);
    }

    const before = roleSnapshot(role);
    if (data.permissions !== undefined) {
      assertSafePermissions(role.name, data.permissions, role.permissions);
      for (const [permission, enabled] of Object.entries(data.permissions)) {
        role.set(`permissions.${permission}`, enabled);
      }
    }

    if (data.name && data.name !== role.name) {
      const name = data.name.toLowerCase();
      if (BUILT_IN_ROLES.has(name)) {
        throw new AppError("Built-in role names are reserved.", 409);
      }
      const existing = await Role.findOne({ name }).session(session);
      if (existing && String(existing._id) !== String(role._id)) {
        throw new AppError("Role already exists", 409);
      }
      role.name = name;
    }

    if (data.active !== undefined) role.active = data.active;
    await role.save({ session });
    if (JSON.stringify(before) !== JSON.stringify(roleSnapshot(role))) {
      await logRoleChange(role, actor, "role_updated", before, session);
    }
    return role;
  });
};

export const deleteRole = async (id, currentUser) => {
  return withAdministrativeMutation(currentUser, async (actor, session) => {
    const role = await Role.findById(id).session(session);

    if (!role) {
      throw new AppError("Role not found", 404);
    }

    if (BUILT_IN_ROLES.has(role.name)) {
      throw new AppError("Built-in roles cannot be deactivated.", 409);
    }

    if (role.active === false) return role;
    const before = roleSnapshot(role);
    role.active = false;
    await role.save({ session });
    await logRoleChange(role, actor, "role_deactivated", before, session);
    return role;
  });
};
