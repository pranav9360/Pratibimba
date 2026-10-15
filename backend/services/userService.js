import User from "../models/User.js";
import Role from "../models/Role.js";
import AppError from "../utils/AppError.js";
import { recordActivity, userActivityTarget } from "./activityLogService.js";
import {
  assertLastActiveSuperAdminRemains,
  assertSupportedRole,
} from "./userRolePolicy.js";
import { assertSuperAdmin, withAdministrativeMutation as withAccountMutation } from "./administrativeMutation.js";
import { prepareManagerAssignments, managerMutationRequested, validateManagerMutation, transferReleasedAssignments } from "./managerAssignments.js";
import { markPasswordChanged } from "../utils/passwordSessions.js";

const EDITABLE_FIELDS = new Set([
  "name", "email", "password", "role", "phone", "prakalpa", "assignedPrakalpas", "active",
]);
const PUBLIC_FIELDS = [
  "_id", "id", "name", "email", "role", "phone", "prakalpa", "assignedPrakalpas",
  "active", "createdAt", "updatedAt", "createdDate",
];
const publicUser = (user) => Object.fromEntries(
  PUBLIC_FIELDS.filter((key) => user[key] !== undefined).map((key) => [key, user[key]])
);
const editableData = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new AppError("Invalid user data", 400);
  if (Object.keys(data).some((key) => !EDITABLE_FIELDS.has(key))) {
    throw new AppError("Unsupported user field", 400);
  }
  if (data.active !== undefined && typeof data.active !== "boolean") {
    throw new AppError("Active must be a boolean", 400);
  }
  for (const key of ["name", "email", "password", "role", "phone", "prakalpa"]) {
    if (data[key] !== undefined && typeof data[key] !== "string") {
      throw new AppError("User text fields must be strings", 400);
    }
  }
  if (data.password !== undefined && data.password.length < 8) {
    throw new AppError("Password must be at least 8 characters", 400);
  }
  if (data.assignedPrakalpas !== undefined && (
    !Array.isArray(data.assignedPrakalpas) || data.assignedPrakalpas.some((name) => typeof name !== "string")
  )) {
    throw new AppError("Assigned Prakalpas must be an array of strings", 400);
  }
  return Object.fromEntries(Object.entries(data).filter(([key]) => EDITABLE_FIELDS.has(key)));
};
const validateRole = async (roleName, session) => {
  assertSupportedRole(roleName);
  const role = await Role.findOne({ name: roleName, active: true }).session(session);
  if (!role) throw new AppError("Role is not available", 400);
};
const accountSnapshot = (user) => ({
  role: user.role,
  active: user.active,
  name: user.name,
  email: user.email,
  phone: user.phone ?? "",
  prakalpa: user.prakalpa ?? "",
  assignedPrakalpas: [...(user.assignedPrakalpas ?? [])],
});

const assertSuperAdminRemains = async (user, nextRole, nextActive, session) => {
  if (typeof nextActive !== "boolean") throw new AppError("Active must be a boolean", 400);
  if (
    user.role !== "super_admin" ||
    !user.active ||
    (nextRole === "super_admin" && nextActive)
  ) {
    return;
  }

  const activeSuperAdmins = await User.countDocuments({
    role: "super_admin",
    active: true,
  }).session(session);

  assertLastActiveSuperAdminRemains({
    currentRole: user.role,
    currentActive: user.active,
    nextRole,
    nextActive,
    activeSuperAdminCount: activeSuperAdmins,
  });
};

const recordAdministrativeChange = async ({
  actor,
  target,
  action,
  oldValue,
  newValue,
  session,
}) => {
  await recordActivity({ actor, target: userActivityTarget(target), action, oldValue, newValue, session });
};

export const getUsers = async (actor) => {
  assertSuperAdmin(actor);
  const users = await User.find().select("-password").sort({ createdAt: -1 });
  return users.map(publicUser);
};

export const getAuditorDirectory = async () => {
  return User.find({ role: "auditor", active: true })
    .select("_id name")
    .sort({ name: 1 })
    .lean();
};

export const getAuditPersonDirectory = async (actor) => {
  if (actor?.active !== true || !["super_admin", "admin", "audit_coordinator"].includes(actor.role)) {
    throw new AppError("Not authorized to view the audit-person directory", 403);
  }
  const people = await User.find({ active: true, role: { $in: ["auditor", "audit_coordinator"] } })
    .select("_id name role").sort({ name: 1 }).lean();
  return people.map(({ _id, name, role }) => ({ _id, name, role }));
};

export const getUserById = async (id, actor) => {
  assertSuperAdmin(actor);
  const user = await User.findById(id).select("-password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return publicUser(user);
};

export const createUser = async (data, currentUser = null) => {
  const fields = editableData(data);
  assertSupportedRole(fields.role);
  if (fields.role === "super_admin") {
    throw new AppError("Superadmin accounts must be provisioned from an existing account.", 403);
  }
  return withAccountMutation(currentUser, async (actor, session) => {
    const existing = await User.findOne({ email: fields.email.toLowerCase() }).session(session);
    if (existing) throw new AppError("Email already exists", 409);
    const assignmentFields = prepareManagerAssignments(fields);
    await validateRole(fields.role, session);
    if (!fields.phone?.trim()) delete fields.phone;
    const [user] = await User.create([assignmentFields], { session });
    if (user.role === "prakalpa_manager") await validateManagerMutation(null, user, session);
    await recordAdministrativeChange({
      actor, target: user, action: "user_role_changed",
      oldValue: { role: null }, newValue: { role: user.role }, session,
    });
    return publicUser(user);
  });
};

export const updateUser = async (id, data, currentUser = null) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new AppError("Invalid user data", 400);
  // The original profile API treats an empty password as "leave unchanged".
  const profile = { ...data };
  if (typeof profile.password === "string" && !profile.password.trim()) delete profile.password;
  const { replacementManagerId, ...userProfile } = profile;
  if (replacementManagerId !== undefined && typeof replacementManagerId !== "string") throw new AppError("Invalid replacement Manager.", 400);
  const fields = editableData(userProfile);
  return withAccountMutation(currentUser, async (actor, session) => {
    const target = await User.findById(id).session(session);
    if (!target) throw new AppError("User not found", 404);
    const assignmentChange = managerMutationRequested(target, fields);
    const safeFields = assignmentChange ? prepareManagerAssignments(fields, target) : fields;
    const previousAssignment = { _id: target._id, role: target.role, active: target.active,
      prakalpa: target.prakalpa, assignedPrakalpas: [...(target.assignedPrakalpas || [])] };
    const nextRole = fields.role ?? target.role;
    const nextActive = fields.active ?? target.active;
    if ((target.role === "super_admin" || nextRole === "super_admin") && actor.role !== "super_admin") {
      throw new AppError("Only a Superadmin can modify or assign a Superadmin account.", 403);
    }
    await assertSuperAdminRemains(target, nextRole, nextActive, session);
    await validateRole(nextRole, session);
    if (fields.email && fields.email.toLowerCase() !== target.email) {
      const existing = await User.findOne({ email: fields.email.toLowerCase() }).session(session);
      if (existing) throw new AppError("Email already exists", 409);
    }
    const before = accountSnapshot(target);
    for (const [key, value] of Object.entries(safeFields)) target[key] = value;
    if (fields.password !== undefined) markPasswordChanged(target);
    await target.save({ session });
    const transfer = await transferReleasedAssignments(previousAssignment, target, replacementManagerId, session);
    if (assignmentChange || transfer) await validateManagerMutation(previousAssignment, target, session);
    if (transfer) await recordAdministrativeChange({ actor, target: transfer.replacement, action: "user_account_updated",
      oldValue: transfer.previous, newValue: accountSnapshot(transfer.replacement), session });
    const after = accountSnapshot(target);
    if (JSON.stringify(before) !== JSON.stringify(after) || fields.password !== undefined) await recordAdministrativeChange({
      actor, target,
      action: before.role !== after.role ? "user_role_changed"
        : before.role === "super_admin" ? "superadmin_account_updated" : "user_account_updated",
      oldValue: before,
      newValue: { ...after, ...(fields.password !== undefined ? { passwordChanged: true } : {}) },
      session,
    });
    return publicUser(target);
  });
};

export const changeUserRole = async (id, nextRole, currentUser = null) => {
  assertSupportedRole(nextRole);
  return updateUser(id, { role: nextRole }, currentUser);
};

export const deleteUser = async (id, currentUser = null, replacementManagerId = undefined) => {
  if (replacementManagerId !== undefined && typeof replacementManagerId !== "string") throw new AppError("Invalid replacement Manager.", 400);
  return withAccountMutation(currentUser, async (actor, session) => {
    const target = await User.findById(id).session(session);
    if (!target) throw new AppError("User not found", 404);
    if (target.role === "super_admin" && actor.role !== "super_admin") {
      throw new AppError("Only a Superadmin can deactivate a Superadmin account.", 403);
    }
    if (target.active === false) return publicUser(target);
    await assertSuperAdminRemains(target, target.role, false, session);
    const before = accountSnapshot(target);
    const previousAssignment = { _id: target._id, role: target.role, active: target.active,
      prakalpa: target.prakalpa, assignedPrakalpas: [...(target.assignedPrakalpas || [])] };
    target.active = false;
    await target.save({ session });
    const transfer = await transferReleasedAssignments(previousAssignment, target, replacementManagerId, session);
    if (target.role === "prakalpa_manager") await validateManagerMutation(previousAssignment, target, session);
    if (transfer) await recordAdministrativeChange({ actor, target: transfer.replacement, action: "user_account_updated",
      oldValue: transfer.previous, newValue: accountSnapshot(transfer.replacement), session });
    await recordAdministrativeChange({
      actor, target, session,
      action: target.role === "super_admin" ? "superadmin_account_updated" : "user_account_updated",
      oldValue: before, newValue: accountSnapshot(target),
    });
    return publicUser(target);
  });
};
