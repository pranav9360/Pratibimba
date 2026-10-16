const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const identifier = value => typeof value === "string" && value.trim() && value !== "Unassigned IQA" ? value.trim() : "";
export function compareIdentifiers(a, b) {
  a = identifier(a); b = identifier(b);
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return collator.compare(a, b);
}
export function compareAuditRecords(a, b) {
  return compareIdentifiers(a.iqaNumber, b.iqaNumber) || compareIdentifiers(a.iqrNumber, b.iqrNumber) ||
    compareIdentifiers(String(a._id || a.id || ""), String(b._id || b.id || ""));
}
export const sortAuditRecords = records => [...records].sort(compareAuditRecords);
