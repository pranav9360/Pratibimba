import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";

const root = new URL("../../artifacts/pratibimba/", import.meta.url);
const requireFrontend = createRequire(new URL("package.json", root));
const ts = requireFrontend("typescript"), React = requireFrontend("react");
const { renderToStaticMarkup } = requireFrontend("react-dom/server");
const read = file => readFileSync(new URL(`src/${file}`, root), "utf8");
const compile = file => ts.transpileModule(read(file), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
} }).outputText;
const requestErrors = {};
vm.runInNewContext(compile("services/request-errors.ts"), { exports: requestErrors });
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(fetchProjects) {
  const states = [], pending = [], listeners = new Map(); let cursor, previousDeps, cleanup;
  const user = { id: "manager", role: "prakalpa_manager", assignedPrakalpas: ["First"] };
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in states)) states[index] = initial;
      return [states[index], value => { states[index] = typeof value === "function" ? value(states[index]) : value; }]; },
    useEffect(effect, deps) { if (!previousDeps || deps.some((value, i) => value !== previousDeps[i])) {
      pending.push(effect); previousDeps = deps;
    } },
  };
  const timers = new Map(); let nextTimer = 0;
  const exports = {};
  vm.runInNewContext(compile("pages/my-prakalpas.tsx"), { exports, AbortController,
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; }, clearTimeout: id => timers.delete(id),
    require: name =>
    name.endsWith("request-errors") ? requestErrors : name === "react" ? hooks : name.endsWith("app-context") ? { useApp: () => ({ currentUser: user }) }
      : name.endsWith("prakalpaService") ? { getMyPrakalpas: fetchProjects } : requireFrontend(name),
    window: { addEventListener: (event, callback) => listeners.set(event, callback), removeEventListener: event => listeners.delete(event) },
  });
  let tree;
  const render = () => { cursor = 0; tree = exports.default(); return renderToStaticMarkup(tree); };
  const flush = async () => { for (const effect of pending.splice(0)) { cleanup?.(); cleanup = effect(); } await tick(); };
  const clickRetry = () => {
    const walk = node => {
      if (!node || typeof node !== "object") return;
      if (node.type === "button" && node.props.children === "Retry") node.props.onClick();
      else React.Children.forEach(node.props?.children, walk);
    }; walk(tree);
  };
  return { user, render, flush, clickRetry, focus: () => listeners.get("focus")?.(), expire: () => { for (const callback of timers.values()) callback(); }, unmount: () => cleanup?.() };
}
const project = name => ({ name, active: true, auditAreas: ["Finance"], prakalpaPramukh: "Contact person",
  prakalpaPramukhEmail: "contact@example.test", seniorEmail: "senior@example.test",
  locations: [{ name: "Office", sublocations: ["Meeting room"] }] });

test("My Prakalpas renders backend-loaded cards and expandable details without mutation controls", async () => {
  let calls = 0; const h = harness(async () => { calls++; return [project("First"), project("Second")]; });
  assert.match(h.render(), /Loading your Prakalpas/); await h.flush(); const html = h.render();
  for (const text of ["First", "Second", "Contact person", "contact@example.test", "senior@example.test", "Office", "Meeting room", "Finance"]) assert.ok(html.includes(text));
  assert.equal((html.match(/<article/g) || []).length, 2); assert.equal((html.match(/<details/g) || []).length, 2);
  assert.doesNotMatch(html, /<(?:button|input|select|form)\b/); assert.equal(calls, 1); h.unmount();
});
test("empty eligible assignments provide a clear read-only empty state", async () => {
  const h = harness(async () => []); h.render(); await h.flush();
  assert.match(h.render(), /No eligible active Prakalpas/); h.unmount();
});
test("request failures show a safe error and Retry performs only another read", async () => {
  let calls = 0; const h = harness(async () => { if (++calls === 1) throw new Error("private diagnostic"); return [project("First")]; });
  h.render(); await h.flush(); const error = h.render(); assert.match(error, /Unable to load/); assert.match(error, /Retry/); assert.doesNotMatch(error, /private diagnostic/);
  h.clickRetry(); h.render(); await h.flush(); assert.match(h.render(), /First/); assert.equal(calls, 2); h.unmount();
});
test("unauthorized roles cannot render project details or initiate a request", async () => {
  for (const role of ["admin", "super_admin", "auditor", "audit_coordinator"]) {
    let calls = 0; const h = harness(async () => { calls++; return [project("First")]; }); h.user.role = role;
    assert.match(h.render(), /Only Prakalpa Managers/); await h.flush(); assert.equal(calls, 0); h.unmount();
  }
});
test("identity changes hide stale details immediately and cancel old responses", async () => {
  let resolveOld; let calls = 0;
  const h = harness(() => ++calls === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve([project("New identity")]));
  h.render(); await h.flush(); h.user.id = "new-manager";
  assert.match(h.render(), /Loading your Prakalpas/); await h.flush();
  resolveOld([project("Old identity")]); await tick(); const html = h.render();
  assert.match(html, /New identity/); assert.doesNotMatch(html, /Old identity/); h.unmount();
});
test("focus does not restart loading and a stalled request exits with Retry; late responses are ignored", async () => {
  let calls = 0; const h = harness(async () => { calls++; return [project("Initial")]; });
  h.render(); await h.flush(); h.focus(); h.focus(); assert.match(h.render(), /Initial/); assert.equal(calls, 1); h.unmount();
  let resolveLate;
  const pending = harness(() => new Promise(resolve => { resolveLate = resolve; }));
  pending.render(); await pending.flush(); assert.match(pending.render(), /Loading/);
  pending.expire(); assert.match(pending.render(), /took too long/); assert.match(pending.render(), /Retry/);
  resolveLate([project("Late result")]); await tick(); assert.doesNotMatch(pending.render(), /Late result/); pending.unmount();
});
test("client always requests the fixed self-service endpoint and rejects malformed responses", async () => {
  const calls = []; let result = { data: { data: [project("First")] } }; const exports = {};
  vm.runInNewContext(compile("services/prakalpaService.ts"), { exports, require: name => name.endsWith("request-errors") ? requestErrors : ({ default: {
    get: async url => { calls.push(url); return result; },
  } }) });
  assert.equal((await exports.getMyPrakalpas({ managerId: "other" }))[0].name, "First");
  assert.deepEqual(calls, ["/prakalpas/mine"]); result = { data: { data: {} } };
  await assert.rejects(exports.getMyPrakalpas(), { status: 502 });
  result = { data: { data: [{ name: "Broken", active: true }] } };
  await assert.rejects(exports.getMyPrakalpas(), { status: 502 });
});
test("Account menu and direct route are restricted to Managers", () => {
  const account = read("components/account-center.tsx");
  const side = read("components/side-nav.tsx");
  const top = read("components/top-nav.tsx");
  const app = read("App.tsx");

  assert.match(
    account,
    /currentUser\?\.role\s*===\s*"prakalpa_manager"\s*&&\s*<Link\s+href="\/my-prakalpas"/
  );
  assert.doesNotMatch(side, /href:\s*"\/my-prakalpas"/);
  assert.doesNotMatch(top, /href:\s*"\/my-prakalpas"/);
  assert.match(
    app,
    /path="\/my-prakalpas"[\s\S]*?allowedRoles=\{\["prakalpa_manager"\]\}[\s\S]*?<MyPrakalpasPage/
  );
});
