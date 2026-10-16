import User from "../models/User.js";
import { managerAssignments } from "./managerAssignments.js";

export const managerDirectory = () => User.find({ role: "prakalpa_manager", active: true })
  .select("_id name email role active prakalpa assignedPrakalpas").lean();

// Runtime projection only: historical contact fields remain untouched in MongoDB.
export const resolvePrakalpaManager = (project, managers) => {
  const candidates = managers.filter(user => user.active !== false &&
    [user.prakalpa, ...(Array.isArray(user.assignedPrakalpas) ? user.assignedPrakalpas : [])]
      .some(name => typeof name === "string" && name.trim() === project.name));
  let status = candidates.length ? "ambiguous" : "missing";
  let manager;
  if (candidates.length === 1) {
    try {
      if (managerAssignments(candidates[0]).includes(project.name)) {
        manager = candidates[0]; status = "resolved";
      }
    } catch { status = "conflicting"; }
  }
  const name = manager?.name || "", email = manager?.email || "";
  const historicalContactMismatch = Boolean(manager && (
    (project.prakalpaPramukh && project.prakalpaPramukh.trim() !== name) ||
    (project.prakalpaPramukhEmail && project.prakalpaPramukhEmail.trim().toLowerCase() !== email.toLowerCase())
  ));
  return {
    assignedManagerId: manager ? String(manager._id) : "",
    assignedManagerName: name,
    assignedManagerEmail: email,
    prakalpaPramukh: name,
    prakalpaPramukhEmail: email,
    managerAssignmentStatus: status,
    historicalContactMismatch,
  };
};
