import AppError from "../utils/AppError.js";

// Reject unknown fields rather than letting model casting silently accept input.
export const organizationalFields = (data, { text, arrays = [], creating = false }) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new AppError("Invalid organizational data", 400);
  }
  const allowed = new Set([...text, ...arrays, "active"]);
  if (Object.keys(data).some(key => !allowed.has(key))) {
    throw new AppError("Unsupported organizational field", 400);
  }
  if (data.active !== undefined && typeof data.active !== "boolean") {
    throw new AppError("Active must be a boolean", 400);
  }
  for (const key of text) {
    if (data[key] !== undefined && typeof data[key] !== "string") {
      throw new AppError("Organizational text fields must be strings", 400);
    }
  }
  for (const key of arrays) {
    if (data[key] !== undefined && (!Array.isArray(data[key]) || data[key].some(value => typeof value !== "string"))) {
      throw new AppError("Organizational list fields must be arrays of strings", 400);
    }
  }
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) =>
    [key, typeof value === "string" ? value.trim() : value]));
  if ((creating || fields.name !== undefined) && !fields.name) {
    throw new AppError("Name is required", 400);
  }
  return fields;
};
