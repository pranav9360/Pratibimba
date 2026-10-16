import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import ActivityLog from "../models/ActivityLog.js";
import Guard from "../models/SuperAdminMutationGuard.js";
import { createUser, updateUser, deleteUser } from "../services/userService.js";
import { createPrakalpa, updatePrakalpa, deletePrakalpa } from "../services/prakalpaService.js";
import { managerAssignments, authorizedManagerPrakalpas } from "../services/managerAssignments.js";
import { buildReportJurisdiction, submitPrakalpaCorrectiveAction } from "../services/reportService.js";

// In-memory transactional persistence; no dotenv, database connections or index operations.
const saved = [];
const mock = (object, key, value) => { saved.push([object, key, object[key]]); object[key] = value; };
const restore = () => { for (const [object, key, value] of saved.splice(0).reverse()) object[key] = value; };
const id = () => new mongoose.Types.ObjectId().toString();
const query = read => ({ select() { return this; }, session() { return this; }, sort() { return this; },
  lean() { return this; }, then(ok, bad) { return Promise.resolve(typeof read === "function" ? read() : read).then(ok, bad); } });
const match = (value, filter) => Object.entries(filter).every(([key, expected]) => expected?.$in
  ? expected.$in.includes(value[key]) : value[key] === expected);
const document = data => ({ ...data, async save() { return this; } });
let users, projects, locations, logs, tail, actor, manager, other, failLocation;
const names = user => managerAssignments(user);
const addProject = (name, active = true) => { const p = document({ _id: id(), name, active }); projects.push(p); return p; };
const managerData = extra => ({ name: "New Manager", email: `${id()}@example.test`, password: "unit-test-only-password123", role: "prakalpa_manager", active: true, ...extra });

beforeEach(() => {
  restore(); tail = Promise.resolve(); logs = []; locations = []; failLocation = false;
  actor = document({ _id: id(), role: "super_admin", active: true, name: "Superadmin", email: "superadmin@example.test" });
  manager = document({ _id: id(), role: "prakalpa_manager", active: true, name: "Manager", email: "manager@example.test", prakalpa: "TEST", assignedPrakalpas: ["TEST", "Second"] });
  other = document({ _id: id(), role: "prakalpa_manager", active: true, name: "Other", email: "other@example.test", prakalpa: "Third", assignedPrakalpas: ["Third"] });
  users = [actor, manager, other]; projects = []; ["TEST", "Second", "Third"].forEach(name => addProject(name));
  mock(User, "findById", value => query(() => users.find(u => String(u._id) === String(value))));
  mock(User, "find", (filter = {}) => query(() => users.filter(u => match(u, filter))));
  mock(User, "findOne", filter => query(() => users.find(u => match(u, filter))));
  mock(User, "countDocuments", filter => query(() => users.filter(u => match(u, filter)).length));
  mock(User, "create", async values => {
    const created = [];
    for (const data of values) {
      // Execute the real User model save middleware (including bcrypt) without persistence.
      const model = new User(data);
      await model.validate();
      await new Promise((resolve, reject) => User.schema.s.hooks.execPre("save", model, [], error => error ? reject(error) : resolve()));
      const record = document({ ...model.toObject(), _id: String(model._id) }); users.push(record); created.push(record);
    }
    return created;
  });
  mock(Prakalpa, "find", (filter = {}) => query(() => projects.filter(p => match(p, filter))));
  mock(Prakalpa, "findOne", filter => query(() => projects.find(p => match(p, filter))));
  mock(Prakalpa, "findById", value => query(() => projects.find(p => p._id === value)));
  mock(Prakalpa, "create", async ([data]) => [addProject(data.name, data.active !== false)]);
  mock(Location, "create", async values => { if (failLocation) throw new Error("Location unavailable"); locations.push(...values); return values; });
  mock(Role, "findOne", () => query({ name: "prakalpa_manager", active: true }));
  mock(Guard, "updateOne", async () => ({ matchedCount: 1 }));
  mock(ActivityLog, "create", async values => { logs.push(...values); return values; });
  mock(mongoose, "startSession", async () => ({
    async withTransaction(operation) {
      const previous = tail; let unlock; tail = new Promise(resolve => { unlock = resolve; }); await previous;
      const snapshot = { users: users.map(u => ({ ...u, assignedPrakalpas: [...(u.assignedPrakalpas || [])] })),
        projects: projects.map(p => ({ ...p })), locations: [...locations], logs: [...logs] };
      try { return await operation(); }
      catch (error) { users = snapshot.users; projects = snapshot.projects; locations = snapshot.locations; logs = snapshot.logs; throw error; }
      finally { unlock(); }
    }, async endSession() {},
  }));
});
after(restore);

test("one Manager can manage multiple Prakalpas and scalar remains a derived compatibility value", async () => {
  const result = await updateUser(manager._id, { assignedPrakalpas: ["Second", "TEST"] }, actor);
  assert.deepEqual(result.assignedPrakalpas, ["Second", "TEST"]); assert.equal(result.prakalpa, "Second");
});

test("a second active Manager cannot claim an owned Prakalpa; failed creation rolls back", async () => {
  const count = users.length;
  await assert.rejects(createUser(managerData({ assignedPrakalpas: ["TEST"] }), actor), /exactly one active Manager/);
  assert.equal(users.length, count); assert.equal(logs.length, 0);
});

test("an active Prakalpa cannot be created without a Manager", async () => {
  await assert.rejects(createPrakalpa({ name: "New", initialLocation: "Office" }, actor), { statusCode: 400 });
  assert.equal(projects.length, 3); assert.equal(locations.length, 0);
});

test("a new Manager may await assignment but existing coverage cannot be removed", async () => {
  const created = await createUser(managerData({ assignedPrakalpas: [] }), actor);
  assert.deepEqual(created.assignedPrakalpas, []);
  await assert.rejects(authorizedManagerPrakalpas(created), /No Prakalpa is assigned/);
  await assert.rejects(updateUser(manager._id, { assignedPrakalpas: [] }, actor), /at least one active Prakalpa/);
  assert.deepEqual(names(users.find(u => u._id === manager._id)), ["TEST", "Second"]);
});

test("User Management creates a Manager with bcrypt, then Prakalpa Management assigns the existing account", async () => {
  const fresh = await createUser(managerData({ email: "fresh@example.test" }), actor);
  const stored = users.find(u => u.email === "fresh@example.test");
  assert.ok(await bcrypt.compare("unit-test-only-password123", stored.password));
  assert.deepEqual(names(stored), []);
  await createPrakalpa({ name: "New", initialLocation: "Office", managerId: String(fresh._id) }, actor);
  assert.deepEqual(names(stored), ["New"]);
  assert.equal(stored.prakalpa, "New");
  assert.doesNotMatch(JSON.stringify(logs), /unit-test-only-password123|\$2[aby]\$/);
});

test("inline account creation is rejected without writing users or Prakalpas", async () => {
  await assert.rejects(createPrakalpa({ name: "New", initialLocation: "Office", newManager: {
    name: "Fresh", email: "fresh@example.test", password: "unit-test-only-password123",
  } }, actor), /Create Manager accounts in User Management/);
  assert.equal(projects.length, 3); assert.equal(users.length, 3); assert.equal(logs.length, 0);
});

test("failed Prakalpa creation leaves the existing Manager and assignments intact", async () => {
  failLocation = true;
  await assert.rejects(createPrakalpa({ name: "New", initialLocation: "Office", managerId: manager._id }, actor), /Location unavailable/);
  assert.equal(projects.length, 3); assert.equal(users.length, 3); assert.equal(logs.length, 0);
  assert.deepEqual(names(users.find(u => u._id === manager._id)), ["TEST", "Second"]);
});

test("explicit reassignment atomically updates both Managers without changing Pramukh", async () => {
  projects[0].prakalpaPramukh = "Separate contact";
  await updatePrakalpa(projects[0]._id, { managerId: other._id }, actor);
  assert.deepEqual(names(manager), ["Second"]); assert.deepEqual(names(other), ["Third", "TEST"]);
  assert.equal(projects[0].prakalpaPramukh, "Separate contact"); assert.equal(logs.length, 2);
});

test("reassignment cannot leave the previous Manager with no active Prakalpa", async () => {
  await assert.rejects(updatePrakalpa(projects[2]._id, { managerId: manager._id }, actor), /at least one active Prakalpa/);
  assert.deepEqual(names(users.find(u => u._id === other._id)), ["Third"]);
  assert.deepEqual(names(users.find(u => u._id === manager._id)), ["TEST", "Second"]); assert.equal(logs.length, 0);
});

for (const action of ["deactivate", "role change", "remove assignment"]) {
  test(`${action} cannot orphan an active Prakalpa`, async () => {
    if (action === "deactivate") await assert.rejects(deleteUser(manager._id, actor), /exactly one active Manager/);
    else await assert.rejects(updateUser(manager._id, action === "role change" ? { role: "auditor" } : { assignedPrakalpas: ["Second"] }, actor), /exactly one active Manager/);
    assert.equal(logs.length, 0); assert.equal(users.find(u => u._id === manager._id).active, true);
  });
}

test("Prakalpa deactivation is allowed with other assignments, but not for the Manager's last active one", async () => {
  await deletePrakalpa(projects[0]._id, actor);
  await assert.rejects(deletePrakalpa(projects[1]._id, actor), /at least one active Prakalpa/);
  assert.equal(projects.find(p => p.name === "Second").active, true);
});

test("inactive Prakalpas do not require coverage or satisfy the Manager minimum; reactivation requires coverage", async () => {
  const dormant = addProject("Dormant", false);
  await assert.rejects(createUser(managerData({ assignedPrakalpas: ["Dormant"] }), actor), /at least one active Prakalpa/);
  await assert.rejects(updatePrakalpa(dormant._id, { active: true }, actor), /exactly one active Manager/);
  await updatePrakalpa(dormant._id, { active: true, managerId: manager._id }, actor);
  assert.equal(projects.find(p => p.name === "Dormant").active, true);
});

test("conflicting concurrent assignments serialize; only one Manager claims an uncovered Prakalpa", async () => {
  addProject("Uncovered");
  const results = await Promise.allSettled([
    updateUser(manager._id, { assignedPrakalpas: ["TEST", "Second", "Uncovered"] }, actor),
    updateUser(other._id, { assignedPrakalpas: ["Third", "Uncovered"] }, actor),
  ]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.statusCode, 409);
  assert.equal(users.filter(u => u.role === "prakalpa_manager" && names(u).includes("Uncovered")).length, 1);
});

test("scalar-only history remains compatible; conflicts are never unioned and unrelated profile edits remain possible", async () => {
  manager.assignedPrakalpas = []; manager.prakalpa = "TEST";
  assert.deepEqual(managerAssignments(manager), ["TEST"]);
  manager.assignedPrakalpas = ["Second"];
  await updateUser(manager._id, { phone: "1234567890" }, actor);
  assert.equal(manager.phone, "1234567890"); assert.deepEqual(manager.assignedPrakalpas, ["Second"]);
  await assert.rejects(updateUser(manager._id, { assignedPrakalpas: ["Second", "TEST"] }, actor), /reconciliation/);
  await assert.rejects(authorizedManagerPrakalpas(users.find(u => u._id === manager._id)), { statusCode: 403 });
});

test("missing references and unsafe renaming are rejected without rewriting audit history", async () => {
  await assert.rejects(updateUser(manager._id, { assignedPrakalpas: ["TEST", "Missing"] }, actor), /missing Prakalpa/);
  await assert.rejects(updatePrakalpa(projects[0]._id, { name: "Renamed" }, actor), /audit history/);
  assert.ok(projects.some(p => p.name === "TEST"));
});

test("manager report jurisdiction uses all uniquely assigned active Prakalpas and excludes inactive/unassigned ones", async () => {
  addProject("Dormant", false); manager.assignedPrakalpas.push("Dormant");
  let received;
  mock(ScheduledAudit, "find", filter => { received = filter; return query([{ _id: "test-audit" }, { _id: "second-audit" }]); });
  await buildReportJurisdiction(manager);
  assert.deepEqual(received, { prakalpa: { $in: ["TEST", "Second"] } });
  other.assignedPrakalpas.push("TEST");
  assert.deepEqual(await authorizedManagerPrakalpas(manager), ["Second"]);
});

test("corrective action is permitted for each assigned active Prakalpa and denied elsewhere", async () => {
  for (const name of ["TEST", "Second", "Third"]) {
    const report = document({ _id: id(), scheduledAudit: id(), workflowStatus: "sent_to_prakalpa", status: "open", workflowHistory: [] });
    mock(Report, "findById", () => query(report));
    mock(ScheduledAudit, "findById", () => query({ _id: report.scheduledAudit, prakalpa: name }));
    if (name === "Third") await assert.rejects(submitPrakalpaCorrectiveAction(report._id, { actionTaken: "Corrected" }, manager), { statusCode: 404 });
    else { await submitPrakalpaCorrectiveAction(report._id, { actionTaken: "Corrected" }, manager); assert.equal(report.actionTaken, "Corrected"); }
  }
});

test("Operational roles cannot create or reassign organizational records", async () => {
  for (const role of ["auditor", "audit_coordinator", "prakalpa_manager"]) {
    await assert.rejects(updatePrakalpa(projects[0]._id, { managerId: other._id }, { ...actor, role }), { statusCode: 403 });
  }
});


for (const action of ["deactivate", "role change", "release one assignment"]) {
  test(`explicit replacement supports ${action} atomically without orphaning either side`, async () => {
    if (action === "deactivate") await deleteUser(manager._id, actor, other._id);
    else await updateUser(manager._id, { ...(action === "role change" ? { role: "auditor" } : { assignedPrakalpas: ["Second"] }), replacementManagerId: other._id }, actor);
    assert.ok(names(other).includes("TEST"));
    if (action !== "release one assignment") assert.ok(names(other).includes("Second"));
    if (action === "deactivate") assert.equal(manager.active, false);
    if (action === "role change") { assert.equal(manager.role, "auditor"); assert.deepEqual(manager.assignedPrakalpas, []); }
    assert.ok(logs.length >= 2); assert.equal(Object.hasOwn(manager, "replacementManagerId"), false);
  });
}

test("a failed activity event rolls back both accounts in a replacement operation", async () => {
  mock(ActivityLog, "create", async () => { throw new Error("Log unavailable"); });
  await assert.rejects(deleteUser(manager._id, actor, other._id), /Log unavailable/);
  assert.equal(users.find(u => u._id === manager._id).active, true);
  assert.deepEqual(names(users.find(u => u._id === other._id)), ["Third"]);
});

test("new Manager payloads cannot inject a privileged role or independently assigned relationship", async () => {
  await assert.rejects(createPrakalpa({ name: "New", initialLocation: "Office", newManager: {
    name: "Injected", email: "injected@example.test", password: "unit-test-only-password123", role: "super_admin",
  } }, actor), { statusCode: 400 });
  assert.equal(projects.length, 3); assert.equal(users.length, 3);
});


test("an inactive Manager can be created without assignments, but cannot be activated without coverage", async () => {
  const user = await createUser(managerData({ active: false }), actor);
  assert.deepEqual(user.assignedPrakalpas, []); assert.equal(user.active, false);
  await assert.rejects(updateUser(user.id || user._id, { active: true }, actor), /at least one active Prakalpa/);
  assert.equal(users.find(u => String(u._id) === String(user._id)).active, false);
});

test("unrelated historical conflicts do not block independent assignments and are never auto-repaired", async () => {
  const legacy = document({ _id: id(), role: "prakalpa_manager", active: true, prakalpa: "Legacy X", assignedPrakalpas: ["Legacy Y"] });
  users.push(legacy);
  await createPrakalpa({ name: "Independent", initialLocation: "Office", managerId: manager._id }, actor);
  assert.deepEqual(legacy.assignedPrakalpas, ["Legacy Y"]); assert.equal(legacy.prakalpa, "Legacy X");
});

test("unrelated profile edits preserve scalar-only records without backfilling the array", async () => {
  manager.assignedPrakalpas = [];
  await updateUser(manager._id, { phone: "1234567890" }, actor);
  assert.deepEqual(manager.assignedPrakalpas, []); assert.equal(manager.prakalpa, "TEST");
});

test("metadata-only and unchanged Prakalpa payloads do not reassign Managers or rewrite unrelated assignments", async () => {
  const initialManager = { prakalpa: manager.prakalpa, assignedPrakalpas: [...manager.assignedPrakalpas] };
  const initialOther = { prakalpa: other.prakalpa, assignedPrakalpas: [...other.assignedPrakalpas] };
  const result = await updatePrakalpa(projects[0]._id, { name: "TEST", active: true, auditAreas: ["Finance"], seniorEmail: "cc@example.test" }, actor);
  assert.equal(result.assignedManagerId, manager._id);
  assert.deepEqual({ prakalpa: manager.prakalpa, assignedPrakalpas: manager.assignedPrakalpas }, initialManager);
  assert.deepEqual({ prakalpa: other.prakalpa, assignedPrakalpas: other.assignedPrakalpas }, initialOther);
  assert.equal(logs.length, 0);
});

test("the live-data shape of a sole active assignment rejects both reassignment and deactivation with 409", async () => {
  for (const data of [{ managerId: manager._id }, { active: false }]) {
    await assert.rejects(updatePrakalpa(projects[2]._id, data, actor), { statusCode: 409 });
    assert.equal(projects.find(p => p.name === "Third").active, true);
    assert.deepEqual(names(users.find(u => u._id === other._id)), ["Third"]);
    assert.deepEqual(names(users.find(u => u._id === manager._id)), ["TEST", "Second"]);
  }
});
