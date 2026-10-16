import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import ActivityLog from "../models/ActivityLog.js";
import { administrativeLogValues } from "../utils/administrativeLogValues.js";
import { getActivityLogs } from "../controllers/activityLogController.js";

test("legacy user events and typed role events validate without migrating history", () => {
  const id = new mongoose.Types.ObjectId();
  const common = { actor: { userId: id, name: "Actor" }, oldValue: {}, newValue: {} };
  const legacy = new ActivityLog({ ...common, target: { userId: id, name: "User", email: "user@example.test" }, action: "user_account_updated" });
  assert.equal(legacy.validateSync(), undefined);
  const role = new ActivityLog({ ...common, target: { entityType: "role", roleId: id, name: "auditor" }, action: "role_updated" });
  assert.equal(role.validateSync(), undefined);
  assert.ok(role.occurredAt instanceof Date);
  const missingEntity = new ActivityLog({ ...common, target: { entityType: "role", name: "auditor" }, action: "role_updated" });
  assert.ok(missingEntity.validateSync().errors["target.roleId"]);
});

test("role permission snapshots allow only known boolean keys and omit nested credentials", () => {
  assert.deepEqual(administrativeLogValues({ name: "auditor", permissions: {
    canSubmitFindings: true, canManageUsers: false, canViewDashboard: "token",
    password: "secret", token: "jwt", secret: true,
  }, password: "secret" }), { name: "auditor", permissions: { canSubmitFindings: true, canManageUsers: false } });
});

test("activity retrieval preserves old history while sanitizing new role events", async () => {
  const original = ActivityLog.find;
  ActivityLog.find = () => ({ sort() { return this; }, limit() { return this; }, lean: async () => [{
    _id: "event", actor: { name: "Actor", email: "actor@example.test", token: "secret" },
    target: { entityType: "role", roleId: "role", name: "custom", password: "secret" },
    action: "role_updated", oldValue: { permissions: { canViewDashboard: true }, password: "secret" },
    newValue: { permissions: { canViewDashboard: false }, token: "secret" },
  }] });
  try {
    const response = await new Promise((resolve, reject) => getActivityLogs({}, { json: resolve }, reject));
    assert.equal(response.data[0].target.roleId, "role");
    assert.equal(response.data[0].newValue.permissions.canViewDashboard, false);
    assert.equal(JSON.stringify(response).includes("secret"), false);
  } finally { ActivityLog.find = original; }
});
