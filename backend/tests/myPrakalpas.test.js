import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import routes from "../routes/prakalpaRoutes.js";
import errorHandler from "../middleware/errorHandler.js";

// Actual HTTP/authentication stack with in-memory reads only. No dotenv or MongoDB.
const secret = "my-prakalpas-unit-test-signing-key";
const original = { user: User.findById, users: User.find, projects: Prakalpa.find,
  locations: Location.find, verify: jwt.verify };
let users, projects, locations, failReads, server, base;
const matches = (record, filter) => Object.entries(filter).every(([key, value]) =>
  value?.$in ? value.$in.includes(record[key]) : record[key] === value);
const query = records => ({ select() { return this; }, sort() { return this; }, lean() { return this; },
  then(ok, bad) { return Promise.resolve(records).then(ok, bad); } });
const request = (path = "/mine", actor = "manager", options = {}) => fetch(base + path, {
  ...options, headers: { "Content-Type": "application/json",
    ...(actor ? { Authorization: `Bearer ${jwt.sign({ id: actor, role: "super_admin", assignedPrakalpas: ["Other"] }, secret)}` } : {}),
    ...options.headers },
});
before(() => {
  // Use real JWT signature verification with an isolated test key, without changing environment settings.
  jwt.verify = token => original.verify(token, secret);
  User.findById = id => query(users.find(user => user._id === id));
  User.find = filter => query(users.filter(user => matches(user, filter)));
  Prakalpa.find = filter => {
    if (failReads) throw new Error("Simulated database outage: private diagnostic");
    return query(projects.filter(project => matches(project, filter)));
  };
  Location.find = filter => query(locations.filter(location => matches(location, filter)));
  const app = express(); app.use(express.json());
  app.use("/api/v1/prakalpas", routes); app.use(errorHandler);
  server = app.listen(0, "127.0.0.1");
  return new Promise((resolve, reject) => {
    server.once("listening", () => { base = `http://127.0.0.1:${server.address().port}/api/v1/prakalpas`; resolve(); });
    server.once("error", reject);
  });
});
beforeEach(() => {
  failReads = false;
  users = [
    { _id: "manager", role: "prakalpa_manager", active: true, prakalpa: "First", assignedPrakalpas: ["First"] },
    { _id: "other", role: "prakalpa_manager", active: true, prakalpa: "Other", assignedPrakalpas: ["Other"] },
    ...["admin", "super_admin", "auditor", "audit_coordinator"].map(role => ({ _id: role, role, active: true })),
  ];
  projects = ["First", "Second", "Other", "Dormant"].map(name => ({ _id: `internal-${name}`, name,
    active: name !== "Dormant", auditAreas: ["Finance"], prakalpaPramukh: "Project contact",
    prakalpaPramukhEmail: "contact@example.test", seniorEmail: "senior@example.test",
    createdAt: new Date(), __v: 7, internalNotes: "Must not escape" }));
  locations = projects.map(project => ({ _id: "internal-location", prakalpa: project.name,
    name: `${project.name} Office`, sublocations: ["Meeting room"], active: true, internalNotes: "private" }));
  locations.push({ prakalpa: "First", name: "Retired location", active: false, sublocations: [] });
});
after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  User.findById = original.user; User.find = original.users; Prakalpa.find = original.projects;
  Location.find = original.locations; jwt.verify = original.verify;
});

test("one assigned Prakalpa returns only safe details and active locations", async () => {
  const response = await request(); assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { data } = await response.json(); assert.equal(data.length, 1); assert.equal(data[0].name, "First");
  assert.deepEqual(Object.keys(data[0]).sort(), ["name", "active", "auditAreas", "prakalpaPramukh", "prakalpaPramukhEmail", "seniorEmail", "locations"].sort());
  assert.deepEqual(data[0].locations, [{ name: "First Office", sublocations: ["Meeting room"] }]);
  assert.doesNotMatch(JSON.stringify(data), /internal|__v|createdAt|assignedPrakalpas|password/);
});
test("multiple assignments are returned, excluding another Manager's records", async () => {
  users[0].assignedPrakalpas.push("Second");
  const response = await request(); assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).data.map(project => project.name), ["First", "Second"]);
});
test("empty and missing historical assignments return an empty self-service view", async () => {
  for (const names of [[], ["Missing"]]) {
    users[0].prakalpa = ""; users[0].assignedPrakalpas = names;
    const response = await request(); assert.equal(response.status, 200); assert.deepEqual((await response.json()).data, []);
  }
});
test("inactive Prakalpas are not eligible even when assigned", async () => {
  users[0].prakalpa = "Dormant"; users[0].assignedPrakalpas = ["Dormant"];
  const response = await request(); assert.equal(response.status, 200); assert.deepEqual((await response.json()).data, []);
});
test("only an authenticated active Manager can open the endpoint", async () => {
  assert.equal((await request("/mine", null)).status, 401);
  for (const role of ["admin", "super_admin", "auditor", "audit_coordinator"]) assert.equal((await request("/mine", role)).status, 403);
  users[0].active = false; assert.equal((await request()).status, 403);
});
test("tampered selectors cannot retrieve another Manager's Prakalpas", async () => {
  for (const query of ["managerId=other", "userId=other", "name=Other", "prakalpa=Other", "includeInactive=true", "assignedPrakalpas[]=Other"]) {
    const response = await request(`/mine?${query}`); assert.equal(response.status, 400);
    assert.equal((await response.json()).data, null);
  }
  assert.equal((await request("/mine/other")).status, 404);
  const response = await request(); assert.deepEqual((await response.json()).data.map(p => p.name), ["First"]);
});
test("legacy scalar-only assignments work but conflicts and duplicate ownership never expand access", async () => {
  users[0].assignedPrakalpas = [];
  let response = await request(); assert.equal(response.status, 200); assert.equal((await response.json()).data[0].name, "First");
  users[0].assignedPrakalpas = ["Other"]; assert.equal((await request()).status, 403);
  users[0].assignedPrakalpas = ["First"]; users[1].assignedPrakalpas.push("First");
  response = await request(); assert.equal(response.status, 200); assert.deepEqual((await response.json()).data, []);
});
test("fresh database identity wins over stale or manipulated JWT role/assignment claims", async () => {
  users[0].prakalpa = "Second"; users[0].assignedPrakalpas = ["Second"];
  let response = await request(); assert.deepEqual((await response.json()).data.map(p => p.name), ["Second"]);
  users[0].role = "auditor"; assert.equal((await request()).status, 403);
});
test("database errors fail safely without returning partial records or internal diagnostics", async () => {
  failReads = true; const response = await request(); assert.equal(response.status, 500);
  const body = await response.json(); assert.equal(body.data, null); assert.equal(body.message, "Internal Server Error");
});
test("read-only self-service does not grant any administrative mutations", async () => {
  for (const [path, method] of [["/mine", "POST"], ["/First", "PUT"], ["/First", "DELETE"], ["/", "POST"]]) {
    assert.equal((await request(path, "manager", { method, body: JSON.stringify({ name: "Forbidden" }) })).status, method === "POST" && path === "/mine" ? 404 : 403);
  }
});
