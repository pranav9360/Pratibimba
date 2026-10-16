import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const root = new URL("../../artifacts/pratibimba/", import.meta.url);
const frontendRequire = createRequire(new URL("package.json", root));
const ts = frontendRequire("typescript"), React = frontendRequire("react");
const { renderToStaticMarkup } = frontendRequire("react-dom/server");
const read = path => readFileSync(new URL(`src/${path}`, root), "utf8");
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(fetchProjects, managers = [], userId = undefined) {
  const states = []; let cursor = 0, previousDeps; const effects = [];
  const hooks = {
    useState(initial) { const key = cursor++; if (!(key in states)) states[key] = initial;
      return [states[key], value => { states[key] = typeof value === "function" ? value(states[key]) : value; }]; },
    useEffect(effect, deps) { if (!previousDeps || deps.some((value, i) => value !== previousDeps[i])) effects.push(effect); previousDeps = deps; },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read("components/management/prakalpa-assignments.tsx"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => name === "react" ? hooks : name.includes("prakalpaService") ? { getPrakalpas: fetchProjects } : frontendRequire(name) });
  const ready = []; const onReady = value => ready.push(value);
  let selected = [], tree;
  const render = () => {
    cursor = 0; tree = exports.PrakalpaAssignments({ value: selected, onChange: value => { selected = value; }, onReady, managers, userId });
    return renderToStaticMarkup(tree);
  };
  const flush = async () => { for (const effect of effects.splice(0)) effect(); await tick(); };
  const find = predicate => {
    let result;
    const visit = node => { if (!node || typeof node !== "object") return;
      if (predicate(node)) result = node;
      React.Children.forEach(node.props?.children, visit); };
    visit(tree); assert.ok(result); return result;
  };
  return { render, flush, find, exports, ready, selected: () => selected };
}

test("assignment options come from backend records, include TEST, and support multiple selections", async () => {
  let calls = 0;
  const h = harness(async () => { calls++; return [{ _id: "test", name: "TEST", active: true }, { _id: "two", name: "Second", active: true }]; });
  assert.match(h.render(), /Loading Prakalpas/); await h.flush(); assert.match(h.render(), /TEST/);
  h.find(node => node.type === "input" && node.props.type === "checkbox").props.onChange({ target: { checked: true } });
  assert.equal(h.selected().length, 1);
  h.render();
  h.find(node => node.type === "input" && node.props.type === "checkbox" && !node.props.checked).props.onChange({ target: { checked: true } });
  assert.equal(h.selected().length, 2); assert.equal(calls, 1); assert.equal(h.ready.at(-1), true);
  const reopened = harness(async () => { calls++; return [{ name: "New backend Prakalpa" }]; });
  reopened.render(); await reopened.flush(); assert.match(reopened.render(), /New backend Prakalpa/); assert.equal(calls, 2);
});

test("empty backend options show an explicit empty state, never demo choices", async () => {
  const h = harness(async () => []); h.render(); await h.flush();
  const html = h.render(); assert.match(html, /No active Prakalpas available/); assert.doesNotMatch(html, /Yoga Kendra|Blood Bank/);
});

test("API failure disables readiness and retry loads real options", async () => {
  let calls = 0;
  const h = harness(async () => { if (++calls === 1) throw new Error("offline"); return [{ name: "TEST", active: true }]; });
  h.render(); await h.flush(); assert.match(h.render(), /Unable to load Prakalpas/); assert.equal(h.ready.at(-1), false);
  h.find(node => node.type === "button" && node.props.children === "Retry").props.onClick();
  h.render(); await h.flush(); assert.match(h.render(), /TEST/); assert.equal(calls, 2);
});

test("historical scalar fallback is compatible but conflicting fields never grant combined access", () => {
  const h = harness(async () => []);
  assert.deepEqual(Array.from(h.exports.assignmentNames({ prakalpa: "TEST" })), ["TEST"]);
  assert.deepEqual(Array.from(h.exports.assignmentNames({ prakalpa: "TEST", assignedPrakalpas: ["Other"] })), []);
  assert.deepEqual(Array.from(h.exports.assignmentNames({ prakalpa: "TEST", assignedPrakalpas: false })), []);
});

test("report predicates include both authorized Prakalpas while excluding unassigned records", () => {
  for (const page of ["all-reports", "open-reports"]) {
    const source = read(`pages/${page}.tsx`);
    const ast = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let code;
    const walk = node => { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === "filterReports") code = node.initializer.getText(ast); ts.forEachChild(node, walk); }; walk(ast);
    const context = { reports: ["TEST", "Second", "Unassigned"].map(prakalpa => ({ prakalpa })), isManager: true, isAuditor: false,
      currentUser: { role: "prakalpa_manager" }, managerPrakalpas: ["TEST", "Second"], useMemo: callback => callback() };
    vm.runInNewContext(ts.transpile(`globalThis.result = ${code}`, { module: ts.ModuleKind.CommonJS }), context);
    assert.deepEqual(Array.from(context.result, r => r.prakalpa), ["TEST", "Second"]);
  }
});

test("management screens use one authoritative Manager and route account creation to User Management", () => {
  const user = read("pages/user-management.tsx"), role = read("pages/role-access.tsx"), project = read("pages/prakalpa-management.tsx");
  assert.doesNotMatch(user, /PRAKALPAS/); assert.match(user, /PrakalpaAssignments/); assert.match(role, /PrakalpaAssignments/);
  assert.match(project, /Assigned Manager/); assert.match(project, /Prakalpa Pramukh/); assert.doesNotMatch(project, /newManager|createManager|type="radio"/);
  assert.match(project, /navigate\("\/user-management"\)/);
  assert.match(project, /Unsaved Prakalpa changes will be lost/);
  assert.match(project, /Prakalpa Pramukh \(Assigned Manager\)/);
  assert.match(user, /unchanged \? \{\} : \{ assignedPrakalpas \}/);
});


test("owned TEST remains visible but cannot be claimed by a second Manager through the selector", async () => {
  const h = harness(async () => [{ name: "TEST", active: true }], [
    { id: "owner", role: "prakalpa_manager", active: true, assignedPrakalpas: ["TEST"] },
  ], "other");
  h.render(); await h.flush(); assert.match(h.render(), /TEST/);
  assert.equal(h.find(node => node.type === "input" && node.props.type === "checkbox").props.disabled, true);
});
