import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../models/User.js";
import Prakalpa from "../models/Prakalpa.js";
import { validationResult } from "express-validator";
import { updateUserValidator } from "../validators/userValidator.js";
import Role from "../models/Role.js";
import ActivityLog from "../models/ActivityLog.js";
import SuperAdminMutationGuard from "../models/SuperAdminMutationGuard.js";
import { changeUserRole, createUser, updateUser, deleteUser } from "../services/userService.js";
import { assertLastActiveSuperAdminRemains } from "../services/userRolePolicy.js";

const originalMethods = {
  startSession: mongoose.startSession,
  findById: User.findById,
  userFindOne: User.findOne,
  userFind: User.find,
  prakalpaFind: Prakalpa.find,
  createUser: User.create,
  countDocuments: User.countDocuments,
  roleFindOne: Role.findOne,
  createLog: ActivityLog.create,
  prakalpaFindOne: Prakalpa.findOne,
  guardUpdateOne: SuperAdminMutationGuard.updateOne,
  guardFindById: SuperAdminMutationGuard.findById,
};

const makeUserQuery = (user) => ({
  session() { return this; },
  select: async () => user,
  then: (resolve, reject) => Promise.resolve(user).then(resolve, reject),
});

const actor = { _id: "actor-id", name: "Superadmin", email: "actor@example.test", role: "super_admin", active: true };
let target;
let activityLogs;
let activeSuperAdmins;
let findByIdCalls;

beforeEach(() => {
  actor.role = "super_admin";
  actor.active = true;
  target = {
    _id: "target-id",
    name: "Target User",
    email: "target@example.com",
    role: "auditor",
    active: true,
    save: async () => {},
  };
  activityLogs = [];
  activeSuperAdmins = 1;
  findByIdCalls = 0;
  mongoose.startSession = async () => ({
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  });
  SuperAdminMutationGuard.updateOne = async (_filter, update, options) => {
    if (options?.upsert) return { upsertedCount: 1 };
    assert.ok(options?.session);
    assert.deepEqual(update, { $inc: { revision: 1 } });
    return { matchedCount: 1 };
  };
  SuperAdminMutationGuard.findById = async () => ({ _id: "guard" });
  User.findById = (id) => {
    findByIdCalls += 1;
    return makeUserQuery(id === "actor-id" ? actor : target);
  };
  User.countDocuments = () => ({
    session: async () => activeSuperAdmins,
  });
  Role.findOne = ({ name }) => makeUserQuery({ name, active: true });
  User.findOne = () => makeUserQuery(null);
  Prakalpa.findOne = () => makeUserQuery({ name: "Valid" });
  const query = value => ({ select() { return this; }, session() { return this; }, lean: async () => value });
  User.find = () => query(target.role === "prakalpa_manager" ? [target] : []);
  Prakalpa.find = () => query([{ name: "Valid", active: true }]);
  ActivityLog.create = async (event) => {
    activityLogs.push(...event);
    return event;
  };
});

afterEach(() => {
  mongoose.startSession = originalMethods.startSession;
  User.findById = originalMethods.findById;
  User.findOne = originalMethods.userFindOne;
  User.find = originalMethods.userFind;
  Prakalpa.find = originalMethods.prakalpaFind;
  User.create = originalMethods.createUser;
  User.countDocuments = originalMethods.countDocuments;
  Role.findOne = originalMethods.roleFindOne;
  ActivityLog.create = originalMethods.createLog;
  Prakalpa.findOne = originalMethods.prakalpaFindOne;
  SuperAdminMutationGuard.updateOne = originalMethods.guardUpdateOne;
  SuperAdminMutationGuard.findById = originalMethods.guardFindById;
});

test("Superadmin assigns a supported role and the change is recorded", async () => {
  const actor = { _id: "actor-id", name: "Admin", email: "admin@example.com", role: "super_admin", active: true };
  const updated = await changeUserRole("target-id", "admin", actor);

  assert.equal(updated.role, "admin");
  assert.equal(activityLogs.length, 1);
  assert.equal(activityLogs[0].actor.userId, actor._id);
  assert.equal(activityLogs[0].target.userId, target._id);
  assert.equal(activityLogs[0].action, "user_role_changed");
  assert.equal(activityLogs[0].oldValue.role, "auditor");
  assert.equal(activityLogs[0].newValue.role, "admin");
});

test("Superadmin-created accounts record their initial role assignment", async () => {
  const actor = { _id: "actor-id", name: "Admin", email: "admin@example.com", role: "super_admin", active: true };
  const createdUser = {
    _id: "created-id",
    name: "New User",
    email: "new@example.com",
    role: "auditor",
  };
  User.findOne = () => makeUserQuery(null);
  User.create = async () => [createdUser];

  await createUser({
    name: createdUser.name,
    email: createdUser.email,
    password: "not-recorded",
    role: "auditor",
  }, actor);

  assert.equal(activityLogs.length, 1);
  assert.equal(activityLogs[0].target.userId, createdUser._id);
  assert.deepEqual(activityLogs[0].oldValue, { role: null });
  assert.deepEqual(activityLogs[0].newValue, { role: "auditor" });
  assert.equal(JSON.stringify(activityLogs[0]).includes("not-recorded"), false);
});

test("Admin cannot assign even ordinary roles", async () => {
  actor.role = "admin";
  await assert.rejects(changeUserRole("target-id", "admin", actor), { statusCode: 403 });
  assert.equal(target.role, "auditor");
  assert.equal(activityLogs.length, 0);
});

test("Ordinary users cannot create accounts", async () => {
  await assert.rejects(
    createUser({ role: "admin" }, { role: "auditor", active: true }),
    { statusCode: 403 }
  );
});

test("Admin cannot bypass role restrictions through the profile API", async () => {
  actor.role = "admin";
  await assert.rejects(updateUser("target-id", { role: "admin" }, actor), { statusCode: 403 });
  assert.equal(target.role, "auditor");
});

test("Unsupported role values are rejected", async () => {
  await assert.rejects(
    changeUserRole("target-id", "root", actor),
    { statusCode: 400 }
  );
});

test("Prakalpa Manager assignment requires an existing Prakalpa", async () => {
  target.prakalpa = "";
  await assert.rejects(
    changeUserRole("target-id", "prakalpa_manager", actor),
    { statusCode: 400, message: "Select Prakalpas for the new Manager." }
  );
});

test("Role service rejects demoting the last active Superadmin", async () => {
  target.role = "super_admin";
  activeSuperAdmins = 1;
  await assert.rejects(
    changeUserRole(
      "target-id",
      "admin",
      actor
    ),
    { statusCode: 409 }
  );
  assert.equal(target.role, "super_admin");
  assert.equal(activityLogs.length, 0);
});

test("The last active Superadmin cannot be demoted or deactivated", () => {
  assert.throws(
    () => assertLastActiveSuperAdminRemains({
      currentRole: "super_admin",
      currentActive: true,
      nextRole: "admin",
      nextActive: true,
      activeSuperAdminCount: 1,
    }),
    { statusCode: 409 }
  );
  assert.throws(
    () => assertLastActiveSuperAdminRemains({
      currentRole: "super_admin",
      currentActive: true,
      nextRole: "super_admin",
      nextActive: false,
      activeSuperAdminCount: 1,
    }),
    { statusCode: 409 }
  );
});

test("A Superadmin may be demoted when another active Superadmin remains", () => {
  assert.doesNotThrow(() => assertLastActiveSuperAdminRemains({
    currentRole: "super_admin",
    currentActive: true,
    nextRole: "admin",
    nextActive: true,
    activeSuperAdminCount: 2,
  }));
});

test("string, numeric, and null booleans cannot bypass validation or policy", async () => {
  for (const active of ["false", "true", "0", 0, 1, null]) {
    const req = { body: { active } };
    for (const validator of updateUserValidator) await validator.run(req);
    assert.equal(validationResult(req).isEmpty(), false);
    await assert.rejects(updateUser("target-id", { active }, actor), { statusCode: 400 });
    assert.throws(() => assertLastActiveSuperAdminRemains({
      currentRole: "super_admin", currentActive: true, nextRole: "super_admin",
      nextActive: active, activeSuperAdminCount: 1,
    }), { statusCode: 400 });
  }
});

test("Superadmin creates Admin accounts without exposing credentials", async () => {
  actor.role = "super_admin";
  User.create = async ([data], options) => {
    assert.ok(options.session);
    return [{ ...data, _id: "new-user", active: true, password: "hashed-secret" }];
  };
  const created = await createUser({ name: "New Admin", email: "new@example.test", password: "input-secret", role: "admin" }, actor);
  assert.equal(created.role, "admin");
  assert.equal(created.password, undefined);
  assert.equal(JSON.stringify(activityLogs).includes("secret"), false);
});

test("Superadmin manages existing Admin profiles and deactivates them", async () => {
  actor.role = "super_admin";
  target.role = "admin";
  await updateUser("target-id", { name: "Updated Admin" }, actor);
  await deleteUser("target-id", actor);
  assert.equal(target.name, "Updated Admin");
  assert.equal(target.active, false);
  assert.equal(activityLogs.at(-1).oldValue.active, true);
  assert.equal(activityLogs.at(-1).newValue.active, false);
});

test("Admin cannot create, assign, modify, demote, or deactivate Superadmin", async () => {
  actor.role = "admin";
  await assert.rejects(createUser({ role: "super_admin" }, actor), { statusCode: 403 });
  await assert.rejects(changeUserRole("target-id", "super_admin", actor), { statusCode: 403 });
  target.role = "super_admin";
  for (const data of [{ name: "Changed" }, { role: "admin" }, { active: false }, { password: "new-secret" }]) {
    await assert.rejects(updateUser("target-id", data, actor), { statusCode: 403 });
  }
  await assert.rejects(deleteUser("target-id", actor), { statusCode: 403 });
  assert.equal(activityLogs.length, 0);
});

test("last-active protection covers DELETE and combined profile updates", async () => {
  target.role = "super_admin";
  await assert.rejects(deleteUser("target-id", actor), { statusCode: 409 });
  await assert.rejects(updateUser("target-id", { role: "admin", active: false }, actor), { statusCode: 409 });
  assert.equal(target.active, true);
  assert.equal(target.role, "super_admin");
});

test("Superadmin profile and status changes produce accurate sanitized snapshots", async () => {
  target.role = "super_admin";
  target.password = "hash-secret";
  activeSuperAdmins = 2;
  const updated = await updateUser("target-id", { name: "Updated", active: false, password: "new-secret" }, actor);
  assert.equal(updated.password, undefined);
  assert.equal(activityLogs[0].action, "superadmin_account_updated");
  assert.equal(activityLogs[0].oldValue.name, "Target User");
  assert.equal(activityLogs[0].oldValue.active, true);
  assert.equal(activityLogs[0].newValue.active, false);
  assert.equal(activityLogs[0].newValue.passwordChanged, true);
  assert.equal(JSON.stringify(activityLogs).includes("secret"), false);
});

test("unknown fields and unsafe assignment payloads are rejected", async () => {
  for (const data of [{ _id: "replacement" }, { passwordChangedAt: new Date() }, { token: "secret" }, { permissions: {} }, { assignedPrakalpas: [1] }]) {
    await assert.rejects(updateUser("target-id", data, actor), { statusCode: 400 });
  }
  assert.equal(target._id, "target-id");
});

test("PUT validates resulting manager assignment and role availability", async () => {
  await assert.rejects(updateUser("target-id", { role: "prakalpa_manager" }, actor), { statusCode: 400 });
  target.role = "prakalpa_manager";
  target.prakalpa = "Valid";
  await assert.rejects(updateUser("target-id", { prakalpa: "" }, actor), { statusCode: 409 });
  Prakalpa.findOne = () => makeUserQuery(null);
  await assert.rejects(updateUser("target-id", { prakalpa: "Missing" }, actor), { statusCode: 409 });
  Role.findOne = () => makeUserQuery(null);
  await assert.rejects(updateUser("target-id", { role: "auditor" }, actor), { statusCode: 400 });
});

test("authorization uses the actor and target read inside the serialized transaction", async () => {
  const staleActor = { ...actor, role: "super_admin" };
  actor.role = "auditor";
  await assert.rejects(updateUser("target-id", { name: "Forbidden" }, staleActor), { statusCode: 403 });
  actor.role = "admin";
  target.role = "super_admin";
  await assert.rejects(updateUser("target-id", { active: false }, actor), { statusCode: 403 });
  assert.equal(target.active, true);
  assert.equal(activityLogs.length, 0);
});

test("failed activity logging rolls back ordinary and Superadmin account changes", async () => {
  for (const role of ["auditor", "super_admin"]) {
    target.role = role;
    target.active = true;
    activeSuperAdmins = 2;
    mongoose.startSession = async () => ({
      withTransaction: async (operation) => {
        const snapshot = { ...target };
        try { await operation(); }
        catch (error) { Object.assign(target, snapshot); throw error; }
      },
      endSession: async () => {},
    });
    ActivityLog.create = async (_entries, options) => { assert.ok(options.session); throw new Error("log write failed"); };
    await assert.rejects(updateUser("target-id", { active: false }, actor), /log write failed/);
    assert.equal(target.active, true);
  }
});

test("session cleanup failure does not report a committed mutation as failed", async () => {
  const originalConsoleError = console.error;
  const messages = [];
  console.error = (...args) => messages.push(args);
  mongoose.startSession = async () => ({
    withTransaction: async (operation) => operation(),
    endSession: async () => { throw new Error("token=secret"); },
  });
  try {
    const updated = await updateUser("target-id", { name: "Committed" }, actor);
    assert.equal(updated.name, "Committed");
    assert.equal(activityLogs.length, 1);
    assert.equal(JSON.stringify(messages).includes("secret"), false);
  } finally { console.error = originalConsoleError; }
});

test("unsupported transaction deployments fail closed before account writes", async () => {
  mongoose.startSession = async () => ({
    withTransaction: async () => { throw Object.assign(new Error("replica set required"), { code: 20 }); },
    endSession: async () => {},
  });
  await assert.rejects(updateUser("target-id", { active: false }, actor), { statusCode: 503 });
  assert.equal(target.active, true);
  assert.equal(activityLogs.length, 0);
});

test("empty profile passwords preserve the original password", async () => {
  target.password = "original-hash";
  const updated = await updateUser("target-id", { name: "Updated", password: "" }, actor);
  assert.equal(target.password, "original-hash");
  assert.equal(updated.password, undefined);
  assert.equal(activityLogs[0].newValue.passwordChanged, undefined);
});

test("deactivation remains possible for an account with stale Prakalpa data", async () => {
  actor.role = "super_admin";
  target.role = "prakalpa_manager";
  target.prakalpa = "";
  const updated = await deleteUser("target-id", actor);
  assert.equal(updated.active, false);
  assert.equal(activityLogs[0].newValue.active, false);
});

test("unchanged profiles and repeated deactivation do not emit misleading duplicate events", async () => {
  await updateUser("target-id", { name: target.name }, actor);
  assert.equal(activityLogs.length, 0);
  await deleteUser("target-id", actor);
  assert.equal(activityLogs.length, 1);
  await deleteUser("target-id", actor);
  assert.equal(activityLogs.length, 1);
});

test("malformed top-level user bodies are rejected without mutations", async () => {
  for (const body of [null, [], "data"]) {
    await assert.rejects(updateUser("target-id", body, actor), { statusCode: 400 });
    await assert.rejects(createUser(body, actor), { statusCode: 400 });
  }
  assert.equal(activityLogs.length, 0);
});

test("Admin cannot create, edit, or deactivate non-Superadmin accounts", async () => {
  actor.role = "admin";
  for (const operation of [
    () => createUser({ name: "New", email: "new@example.test", password: "test-password", role: "auditor" }, actor),
    () => updateUser("target-id", { name: "Forbidden" }, actor),
    () => deleteUser("target-id", actor),
  ]) await assert.rejects(operation(), { statusCode: 403 });
  assert.equal(target.name, "Target User"); assert.equal(target.active, true);
  assert.equal(activityLogs.length, 0);
});
