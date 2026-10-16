import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { validationResult } from "express-validator";
import Role from "../models/Role.js";
import User from "../models/User.js";
import ActivityLog from "../models/ActivityLog.js";
import mongoose from "mongoose";
import Guard from "../models/SuperAdminMutationGuard.js";
import { createRole, updateRole, deleteRole, getRoles } from "../services/roleService.js";
import { updateRoleValidator } from "../validators/roleValidator.js";

const original = { findById: Role.findById, findOne: Role.findOne, create: Role.create };
let role;
let events, freshActor;
const query = (value) => ({ session() { return this; }, then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
const actorFor = (name) => ({ _id: name, name, email: `${name}@example.test`, role: name, active: true });
const methods = { userFind: User.findById, createLog: ActivityLog.create,
  startSession: mongoose.startSession, guard: Guard.updateOne, roleFind: Role.find };
beforeEach(() => {
  events = []; freshActor = undefined;
  User.findById = (id) => query(freshActor ?? actorFor(id));
  ActivityLog.create = async (entries, options) => { assert.ok(options.session); events.push(...entries); };
  mongoose.startSession = async () => ({ withTransaction: async (operation) => operation(), endSession: async () => {} });
  Guard.updateOne = async (_filter, _update, options) => { if (!options?.upsert) assert.ok(options.session); return { matchedCount: 1 }; };
  role = new Role({ name: "admin", permissions: { canManageUsers: true, canCreateAuditPlan: true } });
  role.save = async () => role;
  Role.findById = () => query(role);
  Role.findOne = () => query(null);
  Role.create = async ([data], options) => { assert.ok(options.session); return [new Role(data)]; };
});
afterEach(() => {
  Object.assign(Role, original); Role.find = methods.roleFind;
  User.findById = methods.userFind; ActivityLog.create = methods.createLog;
  mongoose.startSession = methods.startSession; Guard.updateOne = methods.guard;
});

for (const actor of ["super_admin"]) {
  test(`${actor} edits permissions using the unchanged built-in name`, async () => {
    const updated = await updateRole(role._id, { name: "admin", permissions: { canCreateAuditPlan: false } }, actorFor(actor));
    assert.equal(updated.permissions.canCreateAuditPlan, false);
    assert.equal(updated.permissions.canManageUsers, true, "unspecified permission remains stored");
  });
  test(`${actor} creates, renames, and deactivates custom definitions`, async () => {
    role = await createRole({ name: "custom_role", permissions: { canViewDashboard: true } }, actorFor(actor));
    role.save = async () => role;
    await updateRole(role._id, { name: "renamed_role" }, actorFor(actor));
    assert.equal(role.name, "renamed_role");
    await deleteRole(role._id, actorFor(actor));
    assert.equal(role.active, false);
    await updateRole(role._id, { active: true }, actorFor(actor));
    assert.equal(role.active, true);
    assert.deepEqual(events.map(e => e.action), ["role_created", "role_updated", "role_deactivated", "role_updated"]);
  });
}

test("Admin cannot modify the Superadmin definition", async () => {
  role.name = "super_admin";
  await assert.rejects(updateRole(role._id, { permissions: { canManageUsers: false } }, actorFor("admin")), { statusCode: 403 });
});

test("essential role definitions cannot be renamed, deactivated, or recreated", async () => {
  for (const name of ["admin", "super_admin", "audit_coordinator", "auditor", "prakalpa_manager"]) {
    role.name = name;
    await assert.rejects(updateRole(role._id, { name: "renamed" }, actorFor("super_admin")), { statusCode: 403 });
    await assert.rejects(updateRole(role._id, { active: false }, actorFor("super_admin")), { statusCode: 409 });
    await assert.rejects(deleteRole(role._id, actorFor("super_admin")), { statusCode: 409 });
    await assert.rejects(createRole({ name }, actorFor("super_admin")), { statusCode: 409 });
  }
});

test("operational roles cannot receive new administrative permission grants", async () => {
  for (const name of ["auditor", "audit_coordinator", "prakalpa_manager", "custom_role"]) {
    role.name = name;
    for (const permission of ["canManageRoles", "canManagePrakalpas", "canManageAdmins", "canViewAllReports"]) {
      await assert.rejects(updateRole(role._id, { permissions: { [permission]: true } }, actorFor("super_admin")), { statusCode: 403 });
    }
  }
});

test("unchanged existing permissions are preserved when other settings are edited", async () => {
  role.name = "audit_coordinator";
  role.permissions.canViewAllReports = true;
  await updateRole(role._id, { permissions: { canViewAllReports: true, canScheduleAudit: true } }, actorFor("super_admin"));
  assert.equal(role.permissions.canViewAllReports, true);
  assert.equal(role.permissions.canScheduleAudit, true);
});

test("permission and active inputs require supported boolean values", async () => {
  for (const data of [{ active: "false" }, { permissions: { canManageUsers: "false" } }, { permissions: { token: true } }]) {
    const req = { body: data };
    for (const validator of updateRoleValidator) await validator.run(req);
    assert.equal(validationResult(req).isEmpty(), false);
    await assert.rejects(updateRole(role._id, data, actorFor("super_admin")), { statusCode: 400 });
  }
});

test("operational actors cannot edit any role definition", async () => {
  for (const actor of ["auditor", "audit_coordinator", "prakalpa_manager"]) {
    await assert.rejects(updateRole(role._id, { permissions: { canManageUsers: false } }, actorFor(actor)), { statusCode: 403 });
  }
});

test("all role mutations reject revoked or inactive actors read after the account guard", async () => {
  role.name = "custom_role";
  for (const current of [actorFor("auditor"), { ...actorFor("admin"), active: false }]) {
    freshActor = current;
    for (const operation of [() => createRole({ name: "new_role" }, actorFor("super_admin")),
      () => updateRole(role._id, { name: "updated_role" }, actorFor("super_admin")),
      () => deleteRole(role._id, actorFor("super_admin"))]) {
      await assert.rejects(operation(), { statusCode: 403 });
    }
  }
  assert.equal(events.length, 0);
  assert.equal(role.name, "custom_role"); assert.equal(role.active, true);
});

test("a concurrent downgrade before guard acquisition blocks protected role editing", async () => {
  role.name = "super_admin";
  Guard.updateOne = async (_filter, _update, options) => {
    if (!options?.upsert) { assert.ok(options.session); freshActor = actorFor("admin"); }
    return { matchedCount: 1 };
  };
  await assert.rejects(updateRole(role._id, { permissions: { canManageUsers: false } }, actorFor("super_admin")), { statusCode: 403 });
  assert.equal(role.permissions.canManageUsers, true); assert.equal(events.length, 0);
});

test("transaction retries revalidate current actor authority", async () => {
  role.name = "super_admin";
  mongoose.startSession = async () => ({
    withTransaction: async operation => {
      await operation(); // Simulate abort/retry after a conflicting commit.
      role.permissions.canManageUsers = true; events = [];
      freshActor = actorFor("admin");
      await operation();
    }, endSession: async () => {},
  });
  await assert.rejects(updateRole(role._id, { permissions: { canManageUsers: false } }, actorFor("super_admin")), { statusCode: 403 });
  assert.equal(role.permissions.canManageUsers, true); assert.equal(events.length, 0);
});

test("role snapshots log exact partial changes and skip duplicate no-op updates", async () => {
  await updateRole(role._id, { permissions: { canCreateAuditPlan: false } }, actorFor("super_admin"));
  assert.equal(events.length, 1);
  assert.equal(events[0].target.entityType, "role");
  assert.equal(events[0].oldValue.permissions.canCreateAuditPlan, true);
  assert.equal(events[0].newValue.permissions.canCreateAuditPlan, false);
  assert.equal(events[0].newValue.permissions.canManageUsers, true);
  await updateRole(role._id, { permissions: { canCreateAuditPlan: false } }, actorFor("super_admin"));
  assert.equal(events.length, 1);
});

test("role mutation rolls back when its activity write fails", async () => {
  const before = role.toObject();
  mongoose.startSession = async () => ({ withTransaction: async operation => {
    try { await operation(); } catch (error) { role = new Role(before); throw error; }
  }, endSession: async () => {} });
  ActivityLog.create = async () => { throw new Error("Audit unavailable"); };
  await assert.rejects(updateRole(role._id, { permissions: { canManageUsers: false } }, actorFor("super_admin")), /Audit unavailable/);
  assert.equal(role.permissions.canManageUsers, true);
});

test("only Superadmins can request inactive definitions and ordinary reads stay active-only", async () => {
  let filter;
  Role.find = f => { filter = f; return { sort: async () => [role] }; };
  await getRoles(); assert.deepEqual(filter, { active: true });
  await getRoles({ includeInactive: true }, actorFor("super_admin")); assert.deepEqual(filter, {});
  await assert.rejects(getRoles({ includeInactive: true }, actorFor("auditor")), { statusCode: 403 });
});

test("malformed role bodies and hidden fields cannot enter role records or audit logs", async () => {
  for (const body of [null, [], "data", { password: "secret" }, { permissions: null }]) {
    await assert.rejects(updateRole(role._id, body, actorFor("super_admin")), { statusCode: 400 });
  }
  assert.equal(events.length, 0);
});

test("Admin cannot create, update, deactivate, or list inactive role definitions", async () => {
  for (const operation of [
    () => createRole({ name: "new_role" }, actorFor("admin")),
    () => updateRole(role._id, { permissions: { canCreateAuditPlan: false } }, actorFor("admin")),
    () => deleteRole(role._id, actorFor("admin")),
    () => getRoles({ includeInactive: true }, actorFor("admin")),
  ]) await assert.rejects(operation(), { statusCode: 403 });
  assert.equal(events.length, 0);
  assert.equal(role.permissions.canCreateAuditPlan, true);
});
