import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Prakalpa from "../models/Prakalpa.js";
import ActivityLog from "../models/ActivityLog.js";
import SuperAdminMutationGuard from "../models/SuperAdminMutationGuard.js";
import userRoutes from "../routes/userRoutes.js";
import roleRoutes from "../routes/roleRoutes.js";
import activityLogRoutes from "../routes/activityLogRoutes.js";
import auditFindingRoutes from "../routes/auditFindingRoutes.js";
import errorHandler from "../middleware/errorHandler.js";

const originalJwtSecret = process.env.JWT_SECRET;
const originalStartSession = mongoose.startSession;
const originalUserFindById = User.findById;
const originalUserFind = User.find;
const originalUserCountDocuments = User.countDocuments;
const originalRoleFind = Role.find;
const originalRoleFindOne = Role.findOne;
const originalRoleFindById = Role.findById;
const originalRoleCreate = Role.create;
const originalPrakalpaFindOne = Prakalpa.findOne;
const originalPrakalpaFind = Prakalpa.find;
const originalUserCreate = User.create;
const originalUserFindOne = User.findOne;
const originalActivityLogFind = ActivityLog.find;
const originalActivityLogCreate = ActivityLog.create;
const originalGuardUpdateOne = SuperAdminMutationGuard.updateOne;
const originalGuardFindById = SuperAdminMutationGuard.findById;
const users = {
  admin: {
    _id: "admin",
    name: "Admin",
    email: "admin@example.test",
    role: "admin",
    active: true,
    save: async () => {},
  },
  superadmin: {
    _id: "superadmin",
    name: "Superadmin",
    email: "superadmin@example.test",
    role: "super_admin",
    active: true,
    save: async () => {},
  },
  auditor: {
    _id: "auditor",
    name: "Auditor",
    email: "auditor@example.test",
    role: "auditor",
    active: true,
  },
  coordinator: { _id: "coordinator", name: "Coordinator", email: "coordinator@example.test", role: "audit_coordinator", active: true },
  manager: { _id: "manager", name: "Manager", email: "manager@example.test", role: "prakalpa_manager", active: true },
  target: {
    _id: "target",
    name: "Auditor Target",
    email: "target@example.test",
    role: "auditor",
    active: true,
    phone: "",
    prakalpa: "",
    assignedPrakalpas: [],
    save: async () => {},
  },
};
const recordedActivity = [];
beforeEach(() => { recordedActivity.length = 0; });

const userQuery = (user) => ({
  session() { return this; },
  select: async () => user,
  then: (resolve, reject) => Promise.resolve(user).then(resolve, reject),
});

let server;
let baseUrl;

before(async () => {
  process.env.JWT_SECRET = "test-only-superadmin-api-secret";
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
    return userQuery(users[id] ?? null);
  };
  User.countDocuments = () => ({
    session: async () => 1,
  });
  User.find = (filter = {}) => {
    let projection;
    const selected = () => Object.values(users).filter(user =>
      (!filter.active || user.active === true) && (typeof filter.role === "string" ? filter.role === user.role : !filter.role?.$in || filter.role.$in.includes(user.role))
    ).map(user => projection === "_id name role" ? { _id: user._id, name: user.name, role: user.role } : user);
    return { session() { return this; }, select(fields) { projection = fields; return this; }, sort() { return this; },
      lean: async () => selected(), then(resolve, reject) { return Promise.resolve(selected()).then(resolve, reject); } };
  };
  Role.find = () => ({
    sort: async () => [{ name: "auditor" }],
  });
  Role.findOne = ({ name, active }) => userQuery(active ? { name, active: true } : null);
  Prakalpa.find = () => ({ select() { return this; }, session() { return this; }, lean: async () => [{ name: "Valid Prakalpa", active: true }] });
  Prakalpa.findOne = ({ name }) => userQuery(name === "Valid Prakalpa" ? { name } : null);
  Role.findById = (id) => {
    const definition = new Role({ name: id === "role-superadmin" ? "super_admin" : "admin" });
    definition.save = async () => definition;
    return userQuery(definition);
  };
  Role.create = async ([data], options) => {
    assert.ok(options.session);
    return [new Role(data)];
  };
  User.findOne = () => userQuery(null);
  User.create = async ([data]) => [{ ...data, _id: "created", active: true }];
  ActivityLog.find = () => ({
    sort() { return this; },
    limit() { return this; },
    lean: async () => [],
  });
  ActivityLog.create = async (entry) => {
    recordedActivity.push(...entry);
    return entry;
  };

  const app = express();
  app.use(express.json());
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/roles", roleRoutes);
  app.use("/api/v1/activity-logs", activityLogRoutes);
  app.use("/api/v1/audit-findings", auditFindingRoutes);
  app.use(errorHandler);

  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  );
  User.findById = originalUserFindById;
  mongoose.startSession = originalStartSession;
  User.find = originalUserFind;
  User.countDocuments = originalUserCountDocuments;
  Role.find = originalRoleFind;
  Role.findOne = originalRoleFindOne;
  Role.findById = originalRoleFindById;
  Role.create = originalRoleCreate;
  Prakalpa.findOne = originalPrakalpaFindOne;
  Prakalpa.find = originalPrakalpaFind;
  User.create = originalUserCreate;
  User.findOne = originalUserFindOne;
  ActivityLog.find = originalActivityLogFind;
  ActivityLog.create = originalActivityLogCreate;
  SuperAdminMutationGuard.updateOne = originalGuardUpdateOne;
  SuperAdminMutationGuard.findById = originalGuardFindById;
  if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalJwtSecret;
});

test("direct role API revalidates a revoked actor inside the transaction", async () => {
  const originalLookup = User.findById;
  let reads = 0;
  User.findById = () => userQuery(++reads === 1 ? users.superadmin : users.admin);
  try {
    const response = await request("superadmin", "/roles/role-superadmin", {
      method: "PUT", body: JSON.stringify({ permissions: { canManageUsers: false } }),
    });
    assert.equal(response.status, 403);
    assert.equal(reads, 2, "actor is re-read after acquiring the guard");
  } finally { User.findById = originalLookup; }
});

test("direct role create and inactive-definition listing preserve administrative authorization", async () => {
  for (const actor of ["superadmin"]) {
    const response = await request(actor, "/roles", {
      method: "POST", body: JSON.stringify({ name: "custom_configuration" }),
    });
    assert.equal(response.status, 201);
    assert.equal((await request(actor, "/roles?includeInactive=true")).status, 200);
  }
  assert.equal((await request("auditor", "/roles?includeInactive=true")).status, 403);
  const malformed = await request("superadmin", "/roles", {
    method: "POST", body: JSON.stringify({ name: ["custom_configuration"] }),
  });
  assert.equal(malformed.status, 400);
});

test("Manager assignment accepts the required Prakalpa through the complete profile API", async () => {
  const originalTarget = { ...users.target };
  try {
    users.target.prakalpa = "";
    const missing = await request("superadmin", "/users/target/role", {
      method: "PATCH", body: JSON.stringify({ role: "prakalpa_manager" }),
    });
    assert.equal(missing.status, 400);
    const assigned = await request("superadmin", "/users/target", {
      method: "PUT", body: JSON.stringify({ role: "prakalpa_manager", prakalpa: "Valid Prakalpa" }),
    });
    assert.equal(assigned.status, 200);
    const data = (await assigned.json()).data;
    assert.equal(data.role, "prakalpa_manager"); assert.equal(data.prakalpa, "Valid Prakalpa");
  } finally { Object.assign(users.target, originalTarget); }
});

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

const request = (id, path, options = {}) =>
  fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokenFor(id)}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

test("mounted administrative APIs enforce Superadmin and Admin access rules", async () => {
  const adminList = await request("admin", "/users");
  assert.equal(adminList.status, 200, "Admin has management user-list access");

  const adminProfileEdit = await request("admin", "/users/target", {
    method: "PUT",
    body: JSON.stringify({ name: "Updated Target" }),
  });
  assert.equal(adminProfileEdit.status, 200, "Admin can edit ordinary user profiles");
  assert.equal(users.target.name, "Updated Target");

  const superAdminList = await request("superadmin", "/users");
  assert.equal(superAdminList.status, 200, "Superadmin inherits Admin user-list access");

  for (const path of ["/activity-logs"]) {
    const response = await request("admin", path);
    assert.equal(response.status, 403, `Admin cannot GET ${path}`);
  }

  for (const [path, method, body] of [
    ["/users/admin/role", "PATCH", { role: "super_admin" }],
    ["/users/superadmin", "DELETE", null],
  ]) {
    const response = await request("admin", path, {
      method,
      body: body === null ? undefined : JSON.stringify(body),
    });
    assert.equal(response.status, 403, `Admin cannot ${method} ${path}`);
  }

  const selfPromotion = await request("admin", "/users/admin", {
    method: "PUT",
    body: JSON.stringify({ role: "super_admin" }),
  });
  assert.equal(selfPromotion.status, 403, "Admin cannot assign Superadmin through the profile API");

  const ordinaryRoleChange = await request("auditor", "/users/auditor/role", {
    method: "PATCH",
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(ordinaryRoleChange.status, 403, "Ordinary users cannot change their own roles");

  const invalidRole = await request("superadmin", "/users/target/role", {
    method: "PATCH",
    body: JSON.stringify({ role: "root" }),
  });
  assert.equal(invalidRole.status, 400, "Unsupported role values are rejected");

  const assignedRole = await request("superadmin", "/users/target/role", {
    method: "PATCH",
    body: JSON.stringify({ role: "admin" }),
  });
  assert.equal(assignedRole.status, 200, "Superadmin can assign a supported role");
  assert.equal(users.target.role, "admin");
  const roleLog = recordedActivity.find((entry) => entry.action === "user_role_changed");
  assert.ok(roleLog);
  assert.equal(String(roleLog.actor.userId), "superadmin");
  assert.equal(String(roleLog.target.userId), "target");
  assert.equal(roleLog.oldValue.role, "auditor");
  assert.equal(roleLog.newValue.role, "admin");

  const coordinatorApproval = await request(
    "superadmin",
    "/audit-findings/coordinator/finding-summaries"
  );
  assert.equal(coordinatorApproval.status, 403, "Superadmin cannot act as a Coordinator");

  const superAdminRoles = await request("superadmin", "/roles");
  assert.equal(superAdminRoles.status, 200, "Superadmin can view Role Management API");

  const superAdminLogs = await request("superadmin", "/activity-logs");
  assert.equal(superAdminLogs.status, 200, "Superadmin can view Activity Logs API");
});


test("mounted APIs preserve Superadmin creation and permissions while rejecting escalation", async () => {
  const created = await request("superadmin", "/users", {
    method: "POST", body: JSON.stringify({ name: "New Admin", email: "new@example.test", password: "dummy-password1", role: "admin" }),
  });
  assert.equal(created.status, 201);
  const payload = await created.json();
  assert.equal(payload.data.role, "admin");
  assert.equal(payload.data.password, undefined);
  const roles = await request("superadmin", "/roles");
  assert.equal(roles.status, 200);
  for (const actor of ["superadmin"]) {
    const edited = await request(actor, "/roles/role-admin", {
      method: "PUT", body: JSON.stringify({ name: "admin", permissions: { canManageUsers: true } }),
    });
    assert.equal(edited.status, 200);
  }
  const forbiddenDefinition = await request("admin", "/roles/role-superadmin", {
    method: "PUT", body: JSON.stringify({ permissions: { canManageUsers: false } }),
  });
  assert.equal(forbiddenDefinition.status, 403);
  for (const active of ["false", null, 0]) {
    const invalid = await request("superadmin", "/users/superadmin", {
      method: "PUT", body: JSON.stringify({ active }),
    });
    assert.equal(invalid.status, 400);
  }
  const deactivateLast = await request("superadmin", "/users/superadmin", { method: "DELETE" });
  assert.equal(deactivateLast.status, 409);
  const profile = await request("superadmin", "/users/superadmin", {
    method: "PUT", body: JSON.stringify({ name: "Updated Superadmin" }),
  });
  assert.equal(profile.status, 200);
  for (const actor of ["auditor", "coordinator", "manager"]) {
    for (const [path, method] of [["/users", "POST"], ["/users/target", "PUT"], ["/roles/role-admin", "PUT"], ["/roles", "POST"], ["/roles/role-admin", "DELETE"], ["/activity-logs", "GET"]]) {
      const denied = await request(actor, path, { method });
      assert.equal(denied.status, 403);
    }
  }
  assert.equal(JSON.stringify(recordedActivity).includes("dummy-password1"), false);
});

test("Admin manages ordinary accounts but cannot access Role Access or Super Admin targets",async()=>{
 for(const [path,method,body] of [["/users","GET"],["/users/target","GET"],["/users/target","PUT",{name:"Updated"}],["/users/target/role","PATCH",{role:"admin"}]]){
   const response=await request("admin",path,{method,...(body?{body:JSON.stringify(body)}:{})});assert.equal(response.status,200,`${method} ${path}`);
 }
 for(const [path,method,body] of [["/roles","GET"],["/roles?includeInactive=true","GET"],["/roles/role-admin","GET"],["/roles","POST",{name:"new_role"}],["/roles/role-admin","PUT",{permissions:{canManageUsers:false}}],["/roles/role-admin","DELETE"],["/users/superadmin","PUT",{name:"Forbidden"}],["/users/superadmin","DELETE"],["/users/target/role","PATCH",{role:"super_admin"}],["/users/admin/role","PATCH",{role:"super_admin"}]]){
   assert.equal((await request("admin",path,{method,...(body?{body:JSON.stringify(body)}:{})})).status,403,`${method} ${path}`);
 }
});

test("audit-person directory preserves Admin selectors and exposes only eligible names, IDs and roles", async () => {
  const originalTarget = { ...users.target };
  users.target.role = "auditor"; users.target.active = false;
  try {
    for (const actor of ["admin", "superadmin", "coordinator"]) {
      const response = await request(actor, "/users/audit-directory");
      assert.equal(response.status, 200);
      const { data } = await response.json();
      assert.deepEqual(data.map(person => person._id).sort(), ["auditor", "coordinator"]);
      for (const person of data) assert.deepEqual(Object.keys(person).sort(), ["_id", "name", "role"]);
      assert.equal(data.find(person => person.role === "audit_coordinator").name, "Coordinator");
      assert.equal(data.find(person => person.role === "auditor").name, "Auditor");
    }
    for (const actor of ["auditor", "manager"]) {
      assert.equal((await request(actor, "/users/audit-directory")).status, 403);
      assert.equal((await request(actor, "/roles")).status, 200, "existing operational role reads remain available");
    }
    assert.equal((await request("admin", "/users/audit-directory", { method: "PUT", body: JSON.stringify({ name: "Forbidden" }) })).status, 404);
  } finally { Object.assign(users.target, originalTarget); }
});


test("DELETE forwards the explicitly selected replacement Manager to the atomic service", async () => {
  const previousTarget = users.target, previousManager = users.manager, previousLookup = User.findById;
  const replacementId = "aaaaaaaaaaaaaaaaaaaaaaaa";
  users.target = { ...previousTarget, role: "prakalpa_manager", prakalpa: "Valid Prakalpa", assignedPrakalpas: ["Valid Prakalpa"], active: true };
  users.manager = { ...previousManager, _id: replacementId, assignedPrakalpas: [], prakalpa: "", save: async () => {} };
  User.findById = value => value === replacementId ? userQuery(users.manager) : previousLookup(value);
  try {
    const result = await request("superadmin", "/users/target", { method: "DELETE", body: JSON.stringify({ replacementManagerId: replacementId }) });
    assert.equal(result.status, 200);
    assert.equal(users.target.active, false);
    assert.deepEqual(users.manager.assignedPrakalpas, ["Valid Prakalpa"]);
  } finally { users.target = previousTarget; users.manager = previousManager; User.findById = previousLookup; }
});
