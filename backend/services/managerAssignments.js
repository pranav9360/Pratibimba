import User from "../models/User.js";
import Prakalpa from "../models/Prakalpa.js";
import AppError from "../utils/AppError.js";

const normalize = value => typeof value === "string" ? value.trim() : "";
const reconciliation = message => new AppError(`Manager assignment reconciliation required: ${message}`, 409);

// This is the only assignment relationship. The scalar is a legacy compatibility projection.
export const managerAssignments = user => {
  const raw = user.assignedPrakalpas ?? [];
  if (!Array.isArray(raw) || raw.some(name => typeof name !== "string" || !name.trim())) {
    throw reconciliation("invalid assigned Prakalpas.");
  }
  const names = [...new Set(raw.map(normalize))];
  const scalar = normalize(user.prakalpa);
  if (names.length && scalar && !names.includes(scalar)) {
    throw reconciliation("legacy Prakalpa conflicts with the assignment list; no assignments were combined.");
  }
  return names.length ? names : scalar ? [scalar] : [];
};

export const managerMutationRequested = (target, fields) =>
  (target?.role === "prakalpa_manager" || fields.role === "prakalpa_manager") && (
    (fields.role !== undefined && fields.role !== target?.role) ||
    (fields.active !== undefined && fields.active !== target?.active) ||
    (fields.prakalpa !== undefined && fields.prakalpa !== (target?.prakalpa || "")) ||
    (fields.assignedPrakalpas !== undefined && JSON.stringify(fields.assignedPrakalpas) !== JSON.stringify(target?.assignedPrakalpas || []))
  );

export const prepareManagerAssignments = (fields, target = null) => {
  const role = fields.role ?? target?.role;
  if (role !== "prakalpa_manager") {
    if (target?.role === "prakalpa_manager") return { ...fields, prakalpa: "", assignedPrakalpas: [] };
    return fields;
  }
  const explicitArray = Object.hasOwn(fields, "assignedPrakalpas");
  const explicitScalar = Object.hasOwn(fields, "prakalpa");
  if (!target || target.role !== "prakalpa_manager") {
    if (!explicitArray && !explicitScalar && (fields.active ?? target?.active ?? true) === true) throw new AppError("Select Prakalpas for the new Manager.", 400);
  }
  let names;
  if (explicitArray) {
    names = managerAssignments({ assignedPrakalpas: fields.assignedPrakalpas, prakalpa: "" });
    if (explicitScalar && normalize(fields.prakalpa) && !names.includes(normalize(fields.prakalpa))) throw reconciliation("the supplied compatibility field is not in the authoritative list.");
  } else if (explicitScalar) {
    const previous = target?.role === "prakalpa_manager" ? managerAssignments(target) : [];
    if (previous.length > 1) throw new AppError("Supply the complete assignment list; a scalar edit cannot replace multiple Prakalpas.", 409);
    names = managerAssignments({ prakalpa: fields.prakalpa });
  } else names = target?.role === "prakalpa_manager" ? managerAssignments(target) : [];
  return { ...fields, assignedPrakalpas: names, prakalpa: names[0] || "" };
};

export const readAssignmentState = async session => {
  // Sequential reads: a MongoDB transaction session must not execute parallel queries.
  let users = User.find({ role: "prakalpa_manager" }).select("_id name email role active prakalpa assignedPrakalpas");
  let prakalpas = Prakalpa.find({}).select("_id name active");
  if (session) { users = users.session(session); prakalpas = prakalpas.session(session); }
  return { users: await users.lean(), prakalpas: await prakalpas.lean() };
};

export const validateAssignmentState = (state, affectedNames, affectedUsers = []) => {
  const touchedNames = new Set(affectedNames);
  const touchedUsers = new Set(affectedUsers.map(String));
  const byName = new Map(state.prakalpas.map(p => [p.name, p]));
  const checked = new Set();
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const user of state.users) {
      if (checked.has(String(user._id))) continue;
      // Unrelated historical inconsistencies do not block unrelated edits.
      const rawNames = [user.prakalpa, ...(Array.isArray(user.assignedPrakalpas) ? user.assignedPrakalpas : [])];
      if (!touchedUsers.has(String(user._id)) && !rawNames.some(name => touchedNames.has(normalize(name)))) continue;
      checked.add(String(user._id)); expanded = true;
      const names = managerAssignments(user);
      if (names.some(name => !byName.has(name))) throw reconciliation("a Manager references a missing Prakalpa.");
      if (user.active === true && !names.some(name => byName.get(name)?.active === true)) {
        throw reconciliation("every active Manager must retain at least one active Prakalpa.");
      }
      for (const name of names) touchedNames.add(name);
    }
  }
  // Resolve owners for the final affected set, including names added by other Managers.
  for (const name of touchedNames) {
    const project = byName.get(name);
    if (!project || project.active !== true) continue;
    const owners = state.users.filter(user => user.active === true &&
      [user.prakalpa, ...(Array.isArray(user.assignedPrakalpas) ? user.assignedPrakalpas : [])].some(n => normalize(n) === name));
    const eligible = owners.filter(user => managerAssignments(user).includes(name));
    if (eligible.length !== 1) throw reconciliation(`active Prakalpa "${name}" must have exactly one active Manager.`);
  }
};

export const validateManagerMutation = async (before, after, session) => {
  const names = new Set();
  for (const user of [before, after]) {
    if (user?.role === "prakalpa_manager") for (const name of managerAssignments(user)) names.add(name);
  }
  validateAssignmentState(await readAssignmentState(session), names, [after?._id || before?._id]);
};

// Authorization is a fresh read: stale browser identities cannot grant access.
export const authorizedManagerPrakalpas = async user => {
  if (user?.role !== "prakalpa_manager" || user.active !== true) throw new AppError("Active Prakalpa Manager access required.", 403);
  let names;
  try { names = managerAssignments(user); }
  catch { throw new AppError("Manager assignments require administrative reconciliation.", 403); }
  if (!names.length) throw new AppError("No Prakalpa is assigned to this Prakalpa Manager.", 403);
  const projects = await Prakalpa.find({ active: true, name: { $in: names } }).select("name").lean();
  const managers = await User.find({ active: true, role: "prakalpa_manager" }).select("_id prakalpa assignedPrakalpas").lean();
  return projects.map(p => p.name).filter(name => {
    const owners = managers.filter(manager => [manager.prakalpa, ...(Array.isArray(manager.assignedPrakalpas) ? manager.assignedPrakalpas : [])].some(n => normalize(n) === name));
    if (owners.length !== 1 || String(owners[0]._id) !== String(user._id)) return false;
    try { return managerAssignments(owners[0]).includes(name); } catch { return false; }
  });
};

// Transient API input, never another stored relationship. Only explicitly released
// active projects move; the replacement's existing assignments are preserved.
export const transferReleasedAssignments = async (before, after, replacementId, session) => {
  if (!replacementId) return null;
  if (!/^[a-f0-9]{24}$/i.test(replacementId)) throw new AppError("Select a valid replacement Manager.", 400);
  if (before.role !== "prakalpa_manager" || before.active !== true || String(before._id) === replacementId) throw new AppError("Select a different active replacement Manager for released assignments.", 400);
  const retained = after.role === "prakalpa_manager" && after.active === true ? managerAssignments(after) : [];
  const released = managerAssignments(before).filter(name => !retained.includes(name));
  const active = await Prakalpa.find({ active: true, name: { $in: released } }).select("name").session(session).lean();
  if (!active.length) throw new AppError("There are no released active Prakalpas to transfer.", 400);
  const replacement = await User.findById(replacementId).session(session);
  if (!replacement || replacement.role !== "prakalpa_manager" || replacement.active !== true) throw new AppError("Select an existing active replacement Manager.", 400);
  const previous = { role: replacement.role, active: replacement.active, prakalpa: replacement.prakalpa || "", assignedPrakalpas: [...(replacement.assignedPrakalpas || [])] };
  const names = [...new Set([...managerAssignments(replacement), ...active.map(p => p.name)])];
  replacement.assignedPrakalpas = names; replacement.prakalpa = names[0] || "";
  await replacement.save({ session });
  return { replacement, previous };
};
