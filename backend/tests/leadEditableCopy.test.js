import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
test("Lead copy is stored separately and original finding remains untouched", () => {
  const model = read("../models/AuditFinding.js");
  const service = read("../services/auditFindingService.js");
  assert.match(model, /leadEditedCopy:/);
  assert.match(service, /saveLeadEditableCopy/);
  assert.match(service, /assertAssignedLeadAuditor\(audit, currentUser\)/);
  assert.match(service, /workflowStatus: "submitted_to_lead"/);
  assert.match(service, /leadEditedCopy\.findings/);
  assert.doesNotMatch(service.slice(service.indexOf("export const saveLeadEditableCopy"), service.indexOf("export const approveFindingAndSubmitToCoordinator")), /finding\.findings\s*=/);
});
test("Official IQR uses approved copy when available", () => {
  const service = read("../services/auditFindingService.js");
  assert.match(service, /finding\.leadEditedCopy\?\.findings \|\| finding\.findings/);
  assert.match(service, /finding\.leadEditedCopy\?\.severity \|\| finding\.severity/);
});
