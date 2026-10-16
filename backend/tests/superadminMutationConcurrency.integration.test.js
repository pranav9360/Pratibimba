import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import mongoose from "mongoose";
import { fileURLToPath } from "node:url";
import ActivityLog from "../models/ActivityLog.js";
import Role from "../models/Role.js";
import SuperAdminMutationGuard from "../models/SuperAdminMutationGuard.js";
import User from "../models/User.js";
import { changeUserRole } from "../services/userService.js";
import { updateRole } from "../services/roleService.js";

const testMongoUri = process.env.SUPERADMIN_CONCURRENCY_MONGO_URI;
const workerPath = fileURLToPath(
  new URL("./helpers/superadminMutationWorker.js", import.meta.url)
);

let connected = false;

before(async () => {
  if (!testMongoUri) return;

  const parsedUri = new URL(testMongoUri);
  if (
    parsedUri.protocol !== "mongodb:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsedUri.hostname) ||
    parsedUri.pathname.slice(1) !== "superadmin_concurrency_test"
  ) {
    throw new Error(
      "Concurrency integration tests require a local MongoDB database named superadmin_concurrency_test."
    );
  }

  await mongoose.connect(testMongoUri);
  connected = true;
});

after(async () => {
  if (connected) {
    await mongoose.disconnect();
  }
});

const seedPair = async () => {
  await Promise.all([
    User.deleteMany({}),
    ActivityLog.deleteMany({}),
    Role.deleteMany({}),
  ]);
  await Role.create([{ name: "admin", active: true }, { name: "super_admin", active: true }]);
  const [first, second] = await User.create([
    {
      name: "Superadmin One",
      email: "superadmin-one@example.test",
      password: "ConcurrencyTestPassword1",
      role: "super_admin",
      active: true,
    },
    {
      name: "Superadmin Two",
      email: "superadmin-two@example.test",
      password: "ConcurrencyTestPassword2",
      role: "super_admin",
      active: true,
    },
  ]);
  return { first, second };
};

const runWorker = (operation, actorId, targetId) =>
  new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [workerPath, operation, String(actorId), String(targetId)],
      {
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk) => { stdout += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk; });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });

const assertOnlyOneRemovalCommits = async (firstOperation, secondOperation) => {
  const { first, second } = await seedPair();
  const results = await Promise.all([
    runWorker(firstOperation, second._id, first._id),
    runWorker(secondOperation, second._id, second._id),
  ]);

  assert.deepEqual(results.map(({ code }) => code).sort(), [0, 1]);
  assert.equal(results.find(({ code }) => code === 0).stdout, "success");
  // Both workers use the second account as actor. If it loses Superadmin
  // authority first, fresh actor authorization rejects the other request.
  // Otherwise the last-active guard rejects it. Neither removal may commit.
  assert.match(results.find(({ code }) => code !== 0).stderr, /^(403|409):/);
  const activeSuperAdmins = await User.countDocuments({
    role: "super_admin",
    active: true,
  });
  assert.equal(activeSuperAdmins, 1);
  assert.equal(await ActivityLog.countDocuments({}), 1);
};

test(
  "a failed activity-log write rolls back the Superadmin role change",
  { skip: !testMongoUri },
  async () => {
    const { first, second } = await seedPair();
    await ActivityLog.create({
      actor: { name: "Test setup" },
      target: {
        userId: first._id,
        name: first.name,
        email: first.email,
      },
      action: "user_role_changed",
      oldValue: { role: "auditor" },
      newValue: { role: "admin" },
    });
    await ActivityLog.deleteMany({});
    const collectionName = ActivityLog.collection.collectionName;
    await mongoose.connection.db.command({
      collMod: collectionName,
      validator: { action: { $eq: "reject-test-write" } },
    });

    try {
      await assert.rejects(
        changeUserRole(first._id, "admin", second)
      );
      const unchanged = await User.findById(first._id);
      assert.equal(unchanged.role, "super_admin");
      assert.equal(await ActivityLog.countDocuments({}), 0);
    } finally {
      await mongoose.connection.db.command({
        collMod: collectionName,
        validator: {},
      });
    }
  }
);

test(
  "parallel demotions from separate processes preserve one active Superadmin",
  { skip: !testMongoUri },
  async () => assertOnlyOneRemovalCommits("demote", "demote")
);

test(
  "parallel deactivations from separate processes preserve one active Superadmin",
  { skip: !testMongoUri },
  async () => assertOnlyOneRemovalCommits("deactivate", "deactivate")
);

test(
  "parallel mixed demotion and deactivation preserve one active Superadmin",
  { skip: !testMongoUri },
  async () => assertOnlyOneRemovalCommits("demote", "deactivate")
);

test("concurrent protected-role edit and account revocation serialize, with later edits denied",
  { skip: !testMongoUri }, async () => {
    const { first, second } = await seedPair();
    const [edit, revocation] = await Promise.all([
      runWorker("edit-role", second._id, second._id),
      runWorker("demote", first._id, second._id),
    ]);
    assert.equal(revocation.code, 0);
    assert.ok([0, 1].includes(edit.code));
    if (edit.code === 1) assert.match(edit.stderr, /^403:/);
    const definition = await Role.findOne({ name: "super_admin" });
    assert.equal(definition.permissions.canCreateAuditPlan, edit.code === 0);
    // Deliberately pass the pre-revocation snapshot, reproducing the stale actor.
    await assert.rejects(updateRole(definition._id, { permissions: { canCreateAuditPlan: false } }, second), { statusCode: 403 });
    assert.equal(await ActivityLog.countDocuments({}), edit.code === 0 ? 2 : 1);
  });

test("failed role-event logging rolls back the permission mutation",
  { skip: !testMongoUri }, async () => {
    const { first } = await seedPair();
    await ActivityLog.create({ actor: { name: "Setup" }, target: { userId: first._id, name: first.name, email: first.email },
      action: "user_account_updated", oldValue: {}, newValue: {} });
    await ActivityLog.deleteMany({});
    const definition = await Role.findOne({ name: "admin" });
    await mongoose.connection.db.command({ collMod: ActivityLog.collection.collectionName, validator: { action: { $eq: "reject-test-write" } } });
    try {
      await assert.rejects(updateRole(definition._id, { permissions: { canManageUsers: true } }, first));
      assert.equal((await Role.findById(definition._id)).permissions.canManageUsers, false);
      assert.equal(await ActivityLog.countDocuments({}), 0);
    } finally {
      await mongoose.connection.db.command({ collMod: ActivityLog.collection.collectionName, validator: {} });
    }
  });
