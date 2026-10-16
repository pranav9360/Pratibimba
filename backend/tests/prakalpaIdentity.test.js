import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import User from "../models/User.js";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import AuditPlan from "../models/AuditPlan.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import { resolvePrakalpaManager } from "../services/prakalpaIdentity.js";
import { getPrakalpas } from "../services/prakalpaService.js";
import { createAuditPlan, updateAuditPlan, getAuditPlanById } from "../services/auditPlanService.js";
import { uploadReportActionEvidence } from "../controllers/reportActionEvidenceController.js";

// Mock every database operation; no dotenv or MongoDB connection.
const query = value => ({ select() { return this; }, sort() { return this; }, lean() { return this; }, then(ok, bad) { return Promise.resolve(value).then(ok, bad); } });
const saved = [];
const mock = (model, key, fn) => { saved.push([model, key, model[key]]); model[key] = fn; };
let manager, project, managers, plan, writes;
const input = { prakalpa: "First", auditAreas: ["Finance"], auditCoordinator: "Coordinator", auditPlannedDate: "2026-12-01", prakalphaPramukh: "Injected contact" };
const admin = { role: "admin", active: true };
beforeEach(() => {
  writes = 0;
  manager = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", role: "prakalpa_manager", active: true, name: "Assigned Manager", email: "manager@example.test", prakalpa: "First", assignedPrakalpas: ["First", "Second"] };
  managers = [manager];
  project = { name: "First", active: true, auditAreas: ["Finance"], prakalpaPramukh: "Historical Contact", prakalpaPramukhEmail: "old@example.test", seniorEmail: "senior@example.test" };
  plan = { _id: "plan", ...input, status: "pending", prakalphaPramukh: "Historical Plan Contact", save: async () => { writes++; } };
  mock(User, "find", () => query(managers));
  mock(Prakalpa, "find", filter => query(filter.name?.$in ? filter.name.$in.map(name => ({ name, active: true })) : [project]));
  mock(Prakalpa, "findOne", () => query(project)); mock(Location, "find", () => query([]));
  mock(AuditPlan, "find", () => query([])); mock(AuditPlan, "findOne", () => query(plan)); mock(AuditPlan, "findById", () => query(plan));
  mock(AuditPlan, "create", async data => { writes++; plan = { _id: "plan", ...data }; return plan; });
  mock(ScheduledAudit, "find", () => query([])); mock(Report, "find", () => query([]));
});
afterEach(() => { for (const [model, key, fn] of saved.splice(0).reverse()) model[key] = fn; });

test("Manager overrides historical name and email without changing stored contacts or CC", async () => {
  const original = structuredClone(project);
  const [response] = await getPrakalpas(admin);
  assert.equal(response.prakalpaPramukh, manager.name); assert.equal(response.prakalpaPramukhEmail, manager.email);
  assert.equal(response.seniorEmail, "senior@example.test"); assert.equal(response.historicalContactMismatch, true);
  assert.equal(response.managerAssignmentStatus, "resolved"); assert.deepEqual(project, original); assert.equal(writes, 0);
});
test("missing, duplicate and conflicting assignments never invent a Pramukh", () => {
  for (const [users, status] of [[[], "missing"], [[manager, { ...manager, _id: "other" }], "ambiguous"], [[{ ...manager, prakalpa: "Different" }], "conflicting"]]) {
    const identity = resolvePrakalpaManager(project, users);
    assert.equal(identity.managerAssignmentStatus, status); assert.equal(identity.prakalpaPramukh, ""); assert.equal(identity.prakalpaPramukhEmail, "");
  }
});
test("legacy scalar-only and multiple Prakalpa assignments resolve the same account", () => {
  assert.equal(resolvePrakalpaManager(project, [{ ...manager, assignedPrakalpas: [] }]).assignedManagerId, manager._id);
  assert.equal(resolvePrakalpaManager({ name: "Second" }, managers).prakalpaPramukhEmail, manager.email);
});
test("unrelated historical conflicts do not break organizational lookups", async () => {
  managers.push({ ...manager, prakalpa: "Elsewhere", assignedPrakalpas: ["Unrelated"] });
  assert.equal((await getPrakalpas(admin))[0].prakalpaPramukh, manager.name);
});
test("new Audit Plans store assigned Manager despite injected or historical contact values", async () => {
  const created = await createAuditPlan(input, admin);
  assert.equal(created.prakalphaPramukh, manager.name); assert.equal(writes, 1); assert.equal(project.prakalpaPramukh, "Historical Contact");
});
test("Audit Plan reads preserve historical snapshots and explicit edits resolve current Manager", async () => {
  assert.equal((await getAuditPlanById("plan", admin)).prakalphaPramukh, "Historical Plan Contact"); assert.equal(writes, 0);
  assert.equal((await updateAuditPlan("plan", { purpose: "Reviewed edit" }, admin)).prakalphaPramukh, manager.name); assert.equal(writes, 1);
});
test("Audit Plan writes reject missing, duplicate and conflicting assignments before persistence", async () => {
  for (const users of [[], [manager, { ...manager, _id: "other" }], [{ ...manager, prakalpa: "Different" }]]) {
    managers = users; await assert.rejects(createAuditPlan(input, admin), /Manager assignment is/); assert.equal(writes, 0);
  }
});
test("required Audit Area validation remains enforced", async () => {
  await assert.rejects(createAuditPlan({ ...input, auditAreas: [] }, admin), /at least one Audit Area/); assert.equal(writes, 0);
});
test("corrective-action evidence permits both assigned Prakalpas and denies a third", async () => {
  mock(Report, "findById", () => query({ scheduledAudit: "audit", workflowStatus: "closed" }));
  for (const name of ["First", "Second", "Third"]) {
    mock(ScheduledAudit, "findById", () => query({ prakalpa: name }));
    const error = await new Promise(resolve => uploadReportActionEvidence({ params: { id: "bbbbbbbbbbbbbbbbbbbbbbbb" }, user: manager }, {}, resolve));
    assert.equal(error.statusCode, name === "Third" ? 404 : 409);
    assert.match(error.message, name === "Third" ? /Report not found/ : /Evidence upload is only available/);
  }
  assert.equal(writes, 0);
});
