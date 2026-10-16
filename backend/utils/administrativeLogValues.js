import Role from "../models/Role.js";

// Audit snapshots are a closed set: never copy arbitrary request or error data.
const SNAPSHOT_KEYS = new Set([
  "role", "active", "name", "email", "phone", "prakalpa", "assignedPrakalpas", "passwordChanged",
]);

export const administrativeLogValues = (value = {}) => {
  const safe = Object.fromEntries(Object.entries(value).filter(([key, entry]) => SNAPSHOT_KEYS.has(key) && (
    typeof entry === "string" || typeof entry === "boolean" || entry === null ||
    (Array.isArray(entry) && entry.every((item) => typeof item === "string"))
  )));
  // Stored flags are configuration only, not effective access-control grants.
  if (value.permissions && typeof value.permissions === "object") {
    safe.permissions = Object.fromEntries(Object.entries(value.permissions).filter(
      ([key, enabled]) => Role.schema.path("permissions").schema.path(key) && typeof enabled === "boolean"
    ));
  }
  return safe;
};
