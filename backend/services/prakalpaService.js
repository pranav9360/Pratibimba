import mongoose from "mongoose";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import AppError from "../utils/AppError.js";
import { withAdministrativeMutation } from "./administrativeMutation.js";
import { organizationalFields } from "./organizationalFields.js";
import { managerAssignments, readAssignmentState, validateAssignmentState } from "./managerAssignments.js";
import { recordActivity, userActivityTarget } from "./activityLogService.js";

const editable = (data, creating = false) => organizationalFields(data, {
  text: ["name", "prakalpaPramukh", "prakalpaPramukhEmail", "seniorEmail", ...(creating ? ["initialLocation"] : [])],
  arrays: ["auditAreas"], creating,
});
const assignmentInput = data => {
  const { managerId, newManager, ...fields } = data || {};
  if (managerId !== undefined && (typeof managerId !== "string" || !mongoose.isValidObjectId(managerId))) throw new AppError("Select a valid Manager account.", 400);
  if (newManager !== undefined && (managerId !== undefined || !newManager || typeof newManager !== "object" || Array.isArray(newManager))) throw new AppError("Choose an existing Manager or supply one new Manager.", 400);
  return { managerId, newManager, fields };
};
const assignmentSnapshot = user => ({ role: user.role, active: user.active,
  prakalpa: user.prakalpa || "", assignedPrakalpas: [...(user.assignedPrakalpas || [])] });
const assignManager = async (name, managerId, newManager, actor, session) => {
  let selected;
  if (newManager) {
    if (Object.keys(newManager).some(key => !["name", "email", "password", "phone"].includes(key)) ||
      typeof newManager.name !== "string" || !newManager.name.trim() ||
      typeof newManager.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newManager.email) ||
      typeof newManager.password !== "string" || newManager.password.length < 8 ||
      (newManager.phone !== undefined && typeof newManager.phone !== "string")) throw new AppError("New Manager requires a name, valid email and password of at least 8 characters.", 400);
    if (!await Role.findOne({ name: "prakalpa_manager", active: true }).session(session)) throw new AppError("Prakalpa Manager role is not available.", 400);
    if (await User.findOne({ email: newManager.email.trim().toLowerCase() }).session(session)) throw new AppError("Email already exists", 409);
    [selected] = await User.create([{ name: newManager.name.trim(), email: newManager.email.trim().toLowerCase(),
      password: newManager.password, ...(newManager.phone ? { phone: newManager.phone.trim() } : {}),
      role: "prakalpa_manager", active: true, assignedPrakalpas: [name], prakalpa: name }], { session });
    await recordActivity({ actor, target: userActivityTarget(selected), action: "user_role_changed",
      oldValue: { role: null }, newValue: assignmentSnapshot(selected), session });
  } else {
    selected = await User.findById(managerId).session(session);
    if (!selected || selected.role !== "prakalpa_manager" || selected.active !== true) throw new AppError("Select an existing active Prakalpa Manager.", 400);
  }
  const affectedManagers = new Set([String(selected._id)]);
  const managers = await User.find({ role: "prakalpa_manager", active: true }).session(session);
  for (const manager of managers) {
    const isSelected = String(manager._id) === String(selected._id);
    if (!isSelected && ![manager.prakalpa, ...(manager.assignedPrakalpas || [])].includes(name)) continue;
    const names = managerAssignments(manager);
    if (!isSelected && !names.includes(name)) continue;
    const next = isSelected ? [...new Set([...names, name])] : names.filter(item => item !== name);
    if (JSON.stringify(names) === JSON.stringify(next) && manager.prakalpa === next[0]) continue;
    affectedManagers.add(String(manager._id));
    const before = assignmentSnapshot(manager);
    manager.assignedPrakalpas = next; manager.prakalpa = next[0] || "";
    await manager.save({ session });
    await recordActivity({ actor, target: userActivityTarget(manager), action: "user_account_updated",
      oldValue: before, newValue: assignmentSnapshot(manager), session });
  }
  return [...affectedManagers];
};

export const getPrakalpas = async (actor, includeInactive = false) => {
  if (includeInactive && (actor?.role !== "super_admin" || actor?.active !== true)) throw new AppError("Only Superadmins can inspect inactive Prakalpas.", 403);
  const query = Prakalpa.find(includeInactive ? {} : { active: true }).sort({ name: 1 });
  if (actor?.role !== "super_admin") query.select("_id name auditAreas prakalpaPramukh prakalpaPramukhEmail seniorEmail active");
  return query;
};

export const createPrakalpa = async (data, actor) => withAdministrativeMutation(actor, async (freshActor, session) => {
  const input = assignmentInput(data);
  const fields = editable(input.fields, true);
  const { initialLocation, ...prakalpaData } = fields;
  if (!initialLocation) throw new AppError("Location is required to create a Prakalpa.", 400);
  if (fields.active !== false && !input.managerId && !input.newManager) throw new AppError("An active Prakalpa requires one active Manager.", 400);
  if (await Prakalpa.findOne({ name: fields.name }).session(session)) throw new AppError("Prakalpa already exists", 409);
  const [prakalpa] = await Prakalpa.create([prakalpaData], { session });
  await Location.create([{ prakalpa: fields.name, name: initialLocation, sublocations: [], active: true }], { session });
  const manager = input.managerId || input.newManager ? await assignManager(fields.name, input.managerId, input.newManager, freshActor, session) : null;
  validateAssignmentState(await readAssignmentState(session), [fields.name], manager || []);
  return prakalpa;
});

export const updatePrakalpa = async (id, data, actor) => withAdministrativeMutation(actor, async (freshActor, session) => {
  const input = assignmentInput(data);
  const fields = editable(input.fields);
  const prakalpa = await Prakalpa.findById(id).session(session);
  if (!prakalpa) throw new AppError("Prakalpa not found", 404);
  if (fields.name !== undefined && fields.name !== prakalpa.name) throw new AppError("Prakalpa names are used by assignments and audit history. Renaming requires a separately reviewed migration.", 409);
  const assignmentChange = fields.active !== undefined && fields.active !== prakalpa.active || input.managerId || input.newManager;
  for (const [key, value] of Object.entries(fields)) prakalpa[key] = value;
  await prakalpa.save({ session });
  const manager = input.managerId || input.newManager ? await assignManager(prakalpa.name, input.managerId, input.newManager, freshActor, session) : null;
  if (assignmentChange) validateAssignmentState(await readAssignmentState(session), [prakalpa.name], manager || []);
  return prakalpa;
});

export const deletePrakalpa = async (id, actor) => withAdministrativeMutation(actor, async (_freshActor, session) => {
  const prakalpa = await Prakalpa.findById(id).session(session);
  if (!prakalpa) throw new AppError("Prakalpa not found", 404);
  if (prakalpa.active === false) return prakalpa;
  prakalpa.active = false;
  await prakalpa.save({ session });
  validateAssignmentState(await readAssignmentState(session), [prakalpa.name]);
  return prakalpa;
});
