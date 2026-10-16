import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import errorHandler from "../middleware/errorHandler.js";
import AppError from "../utils/AppError.js";
const frontend = new URL("../../artifacts/pratibimba/", import.meta.url);
const requireFrontend = createRequire(new URL("package.json", frontend));
const ts = requireFrontend("typescript");
const errors = {};
vm.runInNewContext(ts.transpileModule(readFileSync(new URL("src/services/request-errors.ts", frontend), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: errors });

for (const [status, phrase] of [[400, "validation detail"], [401, "sign in"], [403, "permission"], [404, "not be found"], [409, "business conflict"], [429, "Too many"], [500, "server could not"]]) {
  test(`frontend renders a safe useful message for HTTP ${status}`, () => {
    const message = status === 400 ? "validation detail" : status === 409 ? "business conflict" : "private diagnostic";
    const output = errors.getRequestErrorMessage({ response: { status, data: { message } } });
    assert.match(output, new RegExp(phrase)); assert.doesNotMatch(output, /private diagnostic/);
  });
}
test("validation values and database diagnostics are never presented to users", () => {
  assert.equal(errors.getRequestErrorMessage({ status: 400, data: { errors: [{ msg: "Choose an active Manager", value: "private-token" }] } }), "Choose an active Manager");
  for (const status of [400, 409, 500]) {
    const output = errors.getRequestErrorMessage({ status, data: { message: "MongoServerError mongodb+srv://private:credential@host Error stack trace" } });
    assert.doesNotMatch(output, /private|credential|mongodb|MongoServerError/);
  }
});
test("timeout and unknown network errors use separate safe messages", () => {
  assert.match(errors.getRequestErrorMessage({ code: "ECONNABORTED" }), /took too long/);
  assert.equal(errors.getRequestErrorMessage(new Error("private request headers"), "Unable to load records."), "Unable to load records.");
});

const responseFor = error => {
  let status, data;
  const old = console.error; console.error = () => {};
  try { errorHandler(error, {}, { status(code) { status = code; return this; }, json(value) { data = value; } }, () => {}); }
  finally { console.error = old; }
  return { status, data };
};
for (const name of ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"]) {
  test(`${name} maps to 401 without leaking JWT details`, () => {
    const result = responseFor(Object.assign(new Error("private token data"), { name }));
    assert.equal(result.status, 401); assert.doesNotMatch(JSON.stringify(result.data), /private token/);
  });
}
test("duplicate keys become safe 409 conflicts; business conflicts remain precise", () => {
  const duplicate = responseFor(Object.assign(new Error("E11000 private-email@example.test"), { code: 11000 }));
  assert.equal(duplicate.status, 409); assert.doesNotMatch(JSON.stringify(duplicate.data), /E11000|private-email/);
  const conflict = responseFor(new AppError("Manager must retain at least one active Prakalpa.", 409));
  assert.equal(conflict.status, 409); assert.match(conflict.data.message, /retain at least one/);
});
test("invalid request values map to 400 and all server errors hide internal details", () => {
  for (const name of ["ValidationError", "CastError"]) assert.equal(responseFor(Object.assign(new Error("private value"), { name })).status, 400);
  const error = responseFor(new AppError("Internal credential / private driver error", 500));
  assert.equal(error.status, 500); assert.equal(error.data.message, "Internal Server Error");
});

test("expired authenticated requests clear only local session state; failed login does not redirect or retry", () => {
  const exports = {}, storage = new Map([["token", "fixture-only"], ["user", "fixture-user"]]); let redirects = 0;
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL("src/services/request-errors.ts", frontend), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports,
    localStorage: { getItem: key => storage.get(key), removeItem: key => storage.delete(key) },
    window: { location: { pathname: "/my-prakalpas", replace: path => { assert.equal(path, "/login"); redirects++; } } },
  });
  exports.handleUnauthorized(401, "/auth/login"); assert.equal(redirects, 0); assert.equal(storage.size, 2);
  exports.handleUnauthorized(403, "/prakalpas"); assert.equal(redirects, 0); assert.equal(storage.size, 2);
  exports.handleUnauthorized(401, "/prakalpas/mine"); assert.equal(redirects, 1); assert.equal(storage.size, 0);
  exports.handleUnauthorized(401, "/reports"); assert.equal(redirects, 1);
});

test("a timed-out write warns to verify saved state before retrying", () => {
  assert.match(errors.getRequestErrorMessage({ code: "ECONNABORTED", config: { method: "put" } }), /check whether your change was saved/);
});

test("identity refresh preserves sessions on server/network failures and rejects invalid authentication", async () => {
  const source = readFileSync(new URL("src/context/app-context.tsx", frontend), "utf8");
  const ast = ts.createSourceFile("context.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let expression;
  const visit = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "refreshLiveData") expression = node.initializer.getText(ast); ts.forEachChild(node, visit); };
  visit(ast); assert.ok(expression);
  for (const status of [401, 403, 500, undefined]) {
    let cleared = 0, redirects = 0;
    const context = { useCallback: fn => fn, requestStatus: errors.requestStatus, logRequestError: () => {},
      getAuthenticatedUser: async () => { throw { response: { status } }; }, setCurrentUser() {}, loadLiveData: async () => {},
      clearAuthenticatedSession: () => { cleared++; }, window: { location: { replace: () => { redirects++; } } } };
    vm.runInNewContext(ts.transpile(`globalThis.refresh = ${expression}`, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), context);
    await context.refresh();
    assert.equal(cleared, [401, 403].includes(status) ? 1 : 0); assert.equal(redirects, cleared);
  }
});
