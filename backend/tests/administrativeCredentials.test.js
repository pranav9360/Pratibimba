import test from "node:test";
import assert from "node:assert/strict";
import errorHandler from "../middleware/errorHandler.js";
import { administrativeLogValues } from "../utils/administrativeLogValues.js";

test("audit snapshot allowlist excludes credentials and nested request objects", () => {
  const filtered = administrativeLogValues({
    role: "admin", active: false, passwordChanged: true,
    password: "secret", passwordHash: "hash-secret", token: "jwt-secret",
    authorization: "Bearer jwt-secret", credentials: { password: "secret" },
    assignedPrakalpas: ["One", { token: "secret" }],
  });
  assert.deepEqual(filtered, { role: "admin", active: false, passwordChanged: true });
});

test("unexpected driver and validation errors cannot expose secrets in logs or responses", () => {
  const originalError = console.error;
  const output = [];
  console.error = (...args) => output.push(args);
  let response;
  const error = Object.assign(new Error("password=secret token=jwt-secret"), {
    value: "hash-secret", request: { headers: { authorization: "Bearer jwt-secret" } },
  });
  try {
    errorHandler(error, {}, { status(code) { assert.equal(code, 500); return this; }, json(value) { response = value; } }, () => {});
    assert.equal(response.message, "Internal Server Error");
    assert.equal(JSON.stringify({ output, response }).includes("secret"), false);
  } finally { console.error = originalError; }
});
