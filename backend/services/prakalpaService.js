import mongoose from "mongoose";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import User from "../models/User.js";
import { resolvePrakalpaManager, managerDirectory } from "./prakalpaIdentity.js";
import AppError from "../utils/AppError.js";
import { withManagementMutation as withAdministrativeMutation } from "./administrativeMutation.js";
import { organizationalFields } from "./organizationalFields.js";
import { managerAssignments, authorizedManagerPrakalpas, readAssignmentState, validateAssignmentState } from "./managerAssignments.js";
import { recordActivity, userActivityTarget } from "./activityLogService.js";

const editable = (data, creating = false) => {
  const fields = organizationalFields(data, {
    text: ["name", "prakalpaPramukh", "prakalpaPramukhEmail", "seniorEmail", ...(creating ? ["initialLocation"] : [])],
    arrays: ["auditAreas"], creating,
  });
  // Validate legacy inputs for compatibility, but preserve stored historical contacts.
  const { prakalpaPramukh, prakalpaPramukhEmail, ...authoritativeFields } = fields;
  return authoritativeFields;
};
const projectResponse = (project, state) => ({
  ...(project.toObject ? project.toObject() : project),
  ...resolvePrakalpaManager(project, state.users),
});
const assignmentInput = data => {
  const { managerId, newManager, ...fields } = data || {};
  if (managerId !== undefined && (typeof managerId !== "string" || !mongoose.isValidObjectId(managerId))) throw new AppError("Select a valid Manager account.", 400);
  if (newManager !== undefined) throw new AppError("Create Manager accounts in User Management, then select the existing Manager.", 400);
  return { managerId, fields };
};
const assignmentSnapshot = user => ({ role: user.role, active: user.active,
  prakalpa: user.prakalpa || "", assignedPrakalpas: [...(user.assignedPrakalpas || [])] });
const assignManager = async (name, managerId, actor, session) => {
  const selected = await User.findById(managerId).session(session);
  if (!selected || selected.role !== "prakalpa_manager" || selected.active !== true) throw new AppError("Select an existing active Prakalpa Manager.", 400);
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
  if (includeInactive && (!["super_admin", "admin"].includes(actor?.role) || actor?.active !== true)) throw new AppError("Only administrators can inspect inactive Prakalpas.", 403);
  const query = Prakalpa.find(includeInactive ? {} : { active: true }).sort({ name: 1 });
  if (actor?.role !== "super_admin") query.select("_id name auditAreas prakalpaPramukh prakalpaPramukhEmail seniorEmail active");
  const projects = await query.lean();
  const managers = await managerDirectory();
  return projects.map(project => ({ ...project, ...resolvePrakalpaManager(project, managers) }));
};

// Self-service identity comes from the authenticated Manager account.
export const getMyPrakalpas = async (actor) => {
  if (actor?.role !== "prakalpa_manager" || actor.active !== true) {
    throw new AppError("Active Prakalpa Manager access required.", 403);
  }
  // Empty historical assignments grant no access. Conflicts still fail closed.
  let assignments;
  try { assignments = managerAssignments(actor); }
  catch { throw new AppError("Manager assignments require administrative reconciliation.", 403); }
  if (!assignments.length) return [];
  const names = await authorizedManagerPrakalpas(actor);
  if (!names.length) return [];
  const projects = await Prakalpa.find({ active: true, name: { $in: names } })
    .select("name active auditAreas prakalpaPramukh prakalpaPramukhEmail seniorEmail")
    .sort({ name: 1 }).lean();
  const locations = await Location.find({ active: true, prakalpa: { $in: names } })
    .select("name prakalpa sublocations").sort({ name: 1 }).lean();
  // Explicit DTOs also prevent future model fields from leaking through this API.
  return projects.map(project => ({
    name: project.name,
    active: project.active,
    auditAreas: project.auditAreas || [],
    prakalpaPramukh: actor.name || "",
    prakalpaPramukhEmail: actor.email || "",
    seniorEmail: project.seniorEmail || "",
    locations: locations.filter(location => location.prakalpa === project.name)
      .map(location => ({ name: location.name, sublocations: location.sublocations || [] })),
  }));
};

export const createPrakalpa = async (data, actor) => withAdministrativeMutation(actor, async (freshActor, session) => {
  const input = assignmentInput(data);
  const fields = editable(input.fields, true);
  const { initialLocation, ...prakalpaData } = fields;
  if (!initialLocation) throw new AppError("Location is required to create a Prakalpa.", 400);
  if (fields.active !== false && !input.managerId) throw new AppError("An active Prakalpa requires one active Manager.", 400);
  if (await Prakalpa.findOne({ name: fields.name }).session(session)) throw new AppError("Prakalpa already exists", 409);
  const [prakalpa] = await Prakalpa.create([prakalpaData], { session });
  await Location.create([{ prakalpa: fields.name, name: initialLocation, sublocations: [], active: true }], { session });
  const manager = input.managerId ? await assignManager(fields.name, input.managerId, freshActor, session) : null;
  const state = await readAssignmentState(session);
  validateAssignmentState(state, [fields.name], manager || []);
  return projectResponse(prakalpa, state);
});

export const updatePrakalpa = async (id, data, actor) => withAdministrativeMutation(actor, async (freshActor, session) => {
  const input = assignmentInput(data);
  const fields = editable(input.fields);
  const prakalpa = await Prakalpa.findById(id).session(session);
  if (!prakalpa) throw new AppError("Prakalpa not found", 404);
  if (fields.name !== undefined && fields.name !== prakalpa.name) throw new AppError("Prakalpa names are used by assignments and audit history. Renaming requires a separately reviewed migration.", 409);
  const assignmentChange = fields.active !== undefined && fields.active !== prakalpa.active || input.managerId;
  for (const [key, value] of Object.entries(fields)) prakalpa[key] = value;
  await prakalpa.save({ session });
  const manager = input.managerId ? await assignManager(prakalpa.name, input.managerId, freshActor, session) : null;
  const state = await readAssignmentState(session);
  if (assignmentChange) validateAssignmentState(state, [prakalpa.name], manager || []);
  return projectResponse(prakalpa, state);
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
