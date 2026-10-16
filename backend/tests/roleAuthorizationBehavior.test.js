import test from "node:test";
import assert from "node:assert/strict";

import authorize from "../middleware/authorize.js";

const runAuthorization = (allowedRoles, user) => {
  const middleware = authorize(...allowedRoles);

  let result = null;

  middleware(
    { user },
    {},
    (error) => {
      result = error || "allowed";
    }
  );

  return result;
};

test("Admin can access Admin actions", () => {
  const result = runAuthorization(
    ["admin"],
    { role: "admin" }
  );

  assert.equal(result, "allowed");
});

test("Superadmin inherits Admin actions", () => {
  const result = runAuthorization(
    ["admin"],
    { role: "super_admin" }
  );

  assert.equal(result, "allowed");
});

test("Admin cannot access Superadmin-only APIs", () => {
  const result = runAuthorization(
    ["super_admin"],
    { role: "admin" }
  );

  assert.equal(result.statusCode, 403);
});

test("Ordinary Auditor cannot access Admin actions", () => {
  const result = runAuthorization(
    ["admin", "super_admin"],
    { role: "auditor" }
  );

  assert.equal(result.statusCode, 403);
});

test("Auditor can access auditor workflow routes", () => {
  const result = runAuthorization(
    ["auditor"],
    { role: "auditor" }
  );

  assert.equal(result, "allowed");
});

test("Legacy Lead Auditor account role is rejected", () => {
  const result = runAuthorization(
    ["auditor"],
    { role: "lead_auditor" }
  );

  assert.equal(result.statusCode, 403);
});

test("Unauthenticated requests are rejected", () => {
  const result = runAuthorization(
    ["auditor"],
    null
  );

  assert.equal(result.statusCode, 401);
});

test("Audit Coordinator cannot approve as an Auditor", () => {
  const result = runAuthorization(
    ["auditor"],
    { role: "audit_coordinator" }
  );

  assert.equal(result.statusCode, 403);
});

test("Superadmin does not inherit Auditor or Coordinator workflow permissions", () => {
  for (const role of ["auditor", "audit_coordinator"]) {
    const result = runAuthorization([role], { role: "super_admin" });
    assert.equal(result.statusCode, 403);
  }
});
