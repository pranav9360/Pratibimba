import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import ActivityLog from "../models/ActivityLog.js";
import Guard from "../models/SuperAdminMutationGuard.js";
import prakalpaRoutes from "../routes/prakalpaRoutes.js";
import locationRoutes from "../routes/locationRoutes.js";
import errorHandler from "../middleware/errorHandler.js";
import * as prakalpas from "../services/prakalpaService.js";
import * as locations from "../services/locationService.js";

// All persistence is mocked. This suite never loads dotenv or connects to MongoDB.
const original = { startSession: mongoose.startSession, user: User.findById, userFind: User.find, logCreate: ActivityLog.create, guard: Guard.updateOne,
  prakalpa: { find: Prakalpa.find, findOne: Prakalpa.findOne, findById: Prakalpa.findById, create: Prakalpa.create },
  location: { find: Location.find, findOne: Location.findOne, findById: Location.findById, create: Location.create },
  secret: process.env.JWT_SECRET };
const actors = Object.fromEntries(["super_admin", "admin", "audit_coordinator", "auditor", "prakalpa_manager"]
  .map(role => [role, { _id: role, name: role, role, active: true }]));
const query = value => ({ session() { return this; }, sort() { return this; }, select() { return this; }, lean() { return this; },
  then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); } });
let manager, createdPrakalpas, prakalpa, location, freshActor, writes, session, server, baseUrl;
beforeEach(() => {
  writes = []; freshActor = actors.super_admin;
  session = { withTransaction: async operation => {
    const p = { ...prakalpa }, l = { ...location }, length = writes.length;
    try { return await operation(); }
    catch (error) { Object.assign(prakalpa, p); Object.assign(location, l); writes.length = length; throw error; }
  }, endSession: async () => {} };
  const save = kind => async options => { assert.equal(options.session, session); writes.push(kind); };
  prakalpa = { _id: "prakalpa", name: "Test Prakalpa", auditAreas: ["Finance"], active: true, save: save("prakalpa") };
  location = { _id: "location", name: "Office", prakalpa: prakalpa.name, sublocations: ["Room"], active: true, save: save("location") };
  mongoose.startSession = async () => session;
  Guard.updateOne = async (_filter, _update, options) => {
    if (!options?.upsert) assert.equal(options.session, session);
    return { matchedCount: 1 };
  };
  createdPrakalpas = [];
  manager = { _id: "aaaaaaaaaaaaaaaaaaaaaaaa", name: "Manager", role: "prakalpa_manager", active: true,
    prakalpa: "Test Prakalpa", assignedPrakalpas: ["Test Prakalpa", "Retained Prakalpa"], save: async () => {} };
  User.find = () => query([manager]);
  ActivityLog.create = async records => records;
  let actorReads = 0;
  User.findById = id => query(id === "super_admin" && ++actorReads > 1 ? freshActor : id === manager._id ? manager : actors[id]);
  Prakalpa.find = () => query([prakalpa, ...createdPrakalpas, { name: "Retained Prakalpa", active: true }]);
  Location.find = () => query([location]);
  Prakalpa.findById = () => query(prakalpa);
  Location.findById = () => query(location);
  Prakalpa.findOne = filter => query(filter.active ? prakalpa : null);
  Location.findOne = () => query(null);
  Prakalpa.create = async ([data], options) => { assert.equal(options.session, session); writes.push("prakalpa-created"); const created = { _id: "created-prakalpa", active: true, ...data }; createdPrakalpas.push(created); return [created]; };
  Location.create = async ([data], options) => { assert.equal(options.session, session); writes.push("location-created"); return [{ _id: "created-location", ...data }]; };
});
before(async () => {
  process.env.JWT_SECRET = "organizational-test-only-secret";
  const app = express(); app.use(express.json());
  app.use("/prakalpas", prakalpaRoutes); app.use("/locations", locationRoutes); app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  mongoose.startSession = original.startSession; User.findById = original.user; User.find = original.userFind; ActivityLog.create = original.logCreate; Guard.updateOne = original.guard;
  Object.assign(Prakalpa, original.prakalpa); Object.assign(Location, original.location);
  if (original.secret === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = original.secret;
});
const request = (role, path, method = "GET", body) => fetch(`${baseUrl}${path}`, {
  method, headers: { Authorization: `Bearer ${jwt.sign({ id: role }, process.env.JWT_SECRET)}`, "Content-Type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

test("Superadmin can create, edit and deactivate Prakalpas, locations and sublocations", async () => {
  for (const [path, method, body, status] of [
    ["/prakalpas", "POST", { name: "New Prakalpa", managerId: "aaaaaaaaaaaaaaaaaaaaaaaa", initialLocation: "Office", auditAreas: ["Finance"] }, 201],
    ["/prakalpas/prakalpa", "PUT", { prakalpaPramukh: "Updated", auditAreas: ["Finance", "Safety"] }, 200],
    ["/locations", "POST", { name: "Annex", prakalpa: "Test Prakalpa", sublocations: ["Room"] }, 201],
    ["/locations/location", "PUT", { sublocations: ["Updated Room"], name: "Updated Office" }, 200],
    ["/locations/location", "DELETE", undefined, 200], ["/prakalpas/prakalpa", "DELETE", undefined, 200],
  ]) assert.equal((await request("super_admin", path, method, body)).status, status, `${method} ${path}`);
  assert.deepEqual(writes, ["prakalpa-created", "location-created", "prakalpa", "location-created", "location", "location", "prakalpa"]);
  assert.equal(prakalpa.active, false); assert.equal(location.active, false);
  assert.deepEqual(location.sublocations, ["Updated Room"]);
});

test("Admin and operational roles receive 403 on every organizational mutation", async () => {
  for (const role of ["admin", "audit_coordinator", "auditor", "prakalpa_manager"]) {
    for (const [path, method, body] of [
      ["/prakalpas", "POST", { name: "Forbidden", initialLocation: "Office" }],
      ["/prakalpas/prakalpa", "PUT", { name: "Forbidden" }], ["/prakalpas/prakalpa", "DELETE"],
      ["/locations", "POST", { name: "Forbidden", prakalpa: "Test Prakalpa", sublocations: [] }],
      ["/locations/location", "PUT", { sublocations: ["Forbidden"] }], ["/locations/location", "DELETE"],
    ]) assert.equal((await request(role, path, method, body)).status, 403, `${role}: ${method} ${path}`);
  }
  assert.equal(writes.length, 0); assert.equal(prakalpa.active, true); assert.equal(location.active, true);
});

test("all existing roles retain read-only Prakalpa, location and sublocation lookups", async () => {
  for (const role of Object.keys(actors)) {
    for (const path of ["/prakalpas", "/locations", "/locations/prakalpa/Test%20Prakalpa"]) {
      const response = await request(role, path); assert.equal(response.status, 200);
      assert.equal((await response.json()).data.length, path === "/prakalpas" ? 2 : 1);
    }
  }
  assert.equal(writes.length, 0);
});

test("organizational APIs reject unknown fields, injected identities and malformed values", async () => {
  for (const path of ["/prakalpas/prakalpa", "/locations/location"]) {
    for (const body of [{ _id: "replacement" }, { role: "super_admin" }, { permissions: {} },
      { createdAt: "replacement" }, { password: "secret" }, { active: "false" }, { name: { $gt: "" } }]) {
      assert.equal((await request("super_admin", path, "PUT", body)).status, 400);
    }
  }
  assert.equal((await request("super_admin", "/locations/location", "PUT", { sublocations: [42] })).status, 400);
  assert.equal((await request("super_admin", "/prakalpas/prakalpa", "PUT", { auditAreas: [{}] })).status, 400);
  for (const [path, body] of [["/prakalpas", { name: "New", initialLocation: "Office", _id: "replacement" }],
    ["/locations", { name: "Office", prakalpa: "Test Prakalpa", sublocations: [], active: 1 }]]) {
    assert.equal((await request("super_admin", path, "POST", body)).status, 400);
  }
  assert.equal(writes.length, 0); assert.equal(prakalpa._id, "prakalpa"); assert.equal(location._id, "location");
});

const operations = actor => [
  () => prakalpas.createPrakalpa({ name: "New", initialLocation: "Office" }, actor),
  () => prakalpas.updatePrakalpa("prakalpa", { name: "Changed" }, actor),
  () => prakalpas.deletePrakalpa("prakalpa", actor),
  () => locations.createLocation({ name: "Annex", prakalpa: "Test Prakalpa", sublocations: [] }, actor),
  () => locations.updateLocation("location", { sublocations: ["Changed"] }, actor),
  () => locations.deleteLocation("location", actor),
];
test("direct service calls cannot bypass organizational authorization", async () => {
  for (const actor of [actors.admin, actors.auditor, null]) {
    for (const operation of operations(actor)) await assert.rejects(operation(), { statusCode: 403 });
  }
  assert.equal(writes.length, 0);
});

test("stale Superadmin requests are rejected using authority read after guard acquisition", async () => {
  for (const replacement of [actors.admin, { ...actors.super_admin, active: false }]) {
    freshActor = replacement;
    for (const [path, method, body] of [["/prakalpas", "POST", { name: "New", initialLocation: "Office" }],
      ["/prakalpas/prakalpa", "PUT", { name: "Changed" }], ["/prakalpas/prakalpa", "DELETE"],
      ["/locations", "POST", { name: "New", prakalpa: "Test Prakalpa", sublocations: [] }],
      ["/locations/location", "PUT", { sublocations: [] }], ["/locations/location", "DELETE"]]) {
      // Fresh authentication succeeds; transactional authority is then revoked.
      let reads = 0; User.findById = () => query(++reads === 1 ? actors.super_admin : freshActor);
      assert.equal((await request("super_admin", path, method, body)).status, 403);
      assert.equal(reads, 2);
    }
  }
  assert.equal(writes.length, 0);
});

test("initial Prakalpa and location creation remain atomic on location failure", async () => {
  Location.create = async () => { throw new Error("Location unavailable"); };
  await assert.rejects(prakalpas.createPrakalpa({ name: "New", initialLocation: "Office", managerId: manager._id }, actors.super_admin), /Location unavailable/);
  assert.equal(writes.length, 0);
});

test("location moves require an existing active Prakalpa", async () => {
  Prakalpa.findOne = () => query(null);
  await assert.rejects(locations.updateLocation("location", { prakalpa: "Missing" }, actors.super_admin), { statusCode: 404 });
  assert.equal(location.prakalpa, "Test Prakalpa"); assert.equal(writes.length, 0);
});

test("operational lookups project only master-data fields required for planning and report delivery", async () => {
  let fields;
  const lookup = value => ({ sort() { return this; }, select(projection) { fields = projection; return this; },
    then(resolve, reject) { return Promise.resolve([value]).then(resolve, reject); } });
  Prakalpa.find = () => lookup(prakalpa);
  Location.find = () => lookup(location);
  await prakalpas.getPrakalpas(actors.admin);
  assert.equal(fields, "_id name auditAreas prakalpaPramukh prakalpaPramukhEmail seniorEmail active");
  await locations.getLocations(actors.admin);
  assert.equal(fields, "_id prakalpa name sublocations active");
  fields = undefined;
  await locations.getLocations(actors.super_admin);
  assert.equal(fields, undefined, "Superadmin keeps complete management responses");
});


test("inactive Prakalpa inspection remains Superadmin-only", async () => {
  for (const role of ["admin", "auditor", "audit_coordinator", "prakalpa_manager"]) {
    assert.equal((await request(role, "/prakalpas?includeInactive=true")).status, 403);
  }
});
