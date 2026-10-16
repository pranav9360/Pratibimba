import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const root = new URL("../../artifacts/pratibimba/", import.meta.url);
const requireFrontend = createRequire(new URL("package.json", root));
const ts = requireFrontend("typescript"), React = requireFrontend("react");
const { renderToStaticMarkup } = requireFrontend("react-dom/server");
const source = readFileSync(new URL("src/pages/prakalpa-management.tsx", root), "utf8");
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const errors = {}; vm.runInNewContext(compile(readFileSync(new URL("src/services/request-errors.ts", root), "utf8")), { exports: errors });
const tick = () => new Promise(resolve => setImmediate(resolve));
function harness(update = async () => {}) {
  const users = [{ id: "manager", role: "prakalpa_manager", active: true, name: "Existing Manager", email: "existing@example.test", assignedPrakalpas: ["Another project", "Test"] },
    { id: "inactive", role: "prakalpa_manager", active: false, name: "Inactive Manager" }, { id: "auditor", role: "auditor", active: true, name: "Auditor" }];
  const project = { _id: "project", name: "Test", active: true, seniorEmail: "cc@example.test", auditAreas: ["Finance"], assignedManagerId: "manager", managerAssignmentStatus: "resolved" };
  const states = [users, "", "", true, [project], [], false]; let cursor, tree, submits = 0;
  const navigations = [], exports = {};
  const hooks = {
    useState(initial) { const key = cursor++; if (!(key in states)) states[key] = initial;
      return [states[key], next => { states[key] = typeof next === "function" ? next(states[key]) : next; }]; },
    useRef(initial) { const key = cursor++; if (!(key in states)) states[key] = { current: initial }; return states[key]; },
    useEffect() {}, useMemo(fn) { return fn(); },
  };
  const services = { getPrakalpas: async () => [project], getLocations: async () => [], getUsers: async () => ({ success: true, data: users }),
    createPrakalpa: async () => { submits++; }, updatePrakalpa: async (...args) => { submits++; return update(...args); }, ...errors };
  const dialogs = { AlertDialog: ({ open, children }) => open ? children : null, AlertDialogContent: ({ children }) => React.createElement("div", { role: "alertdialog" }, children),
    AlertDialogHeader: "div", AlertDialogTitle: "h2", AlertDialogDescription: "p", AlertDialogFooter: "div", AlertDialogCancel: "button", AlertDialogAction: "button" };
  vm.runInNewContext(compile(source), { exports, document: { activeElement: { focus() {} } },
    require: name => name === "react" ? hooks : name === "wouter" ? { useLocation: () => ["/prakalpa-management", path => navigations.push(path)] }
      : name.includes("app-context") ? { useApp: () => ({ currentUser: { role: "super_admin" } }) }
      : name.includes("filter-toolbar") ? { FilterToolbar: () => null }
      : name.endsWith("alert-dialog") ? dialogs
      : name.includes("prakalpa-assignments") ? { assignmentNames: user => user.assignedPrakalpas || [] }
      : name.includes("/services/") ? services : requireFrontend(name),
  });
  const render = () => { cursor = 0; tree = exports.default(); return renderToStaticMarkup(tree); };
  const find = predicate => { let found; const visit = node => { if (!node || typeof node !== "object") return;
    if (predicate(node)) found = node; React.Children.forEach(node.props?.children, visit); }; visit(tree); assert.ok(found); return found; };
  const button = label => find(node => node.type === "button" && (node.props.children === label || React.Children.toArray(node.props.children).includes(label)));
  return { render, find, button, navigations, submits: () => submits };
}

test("Manager creation uses an in-app warning; Cancel retains the draft and Continue navigates without submitting", async () => {
  const h = harness(); h.render(); h.button("Create Prakalpa").props.onClick(); h.render();
  const select = h.find(node => node.type === "select" && node.props.id === "assigned-manager");
  assert.equal(React.Children.toArray(select.props.children).at(-1).props.value, "__create__");
  assert.match(h.render(), /Existing Manager \(existing@example.test\)/); assert.doesNotMatch(h.render(), /Inactive Manager|type="radio"/);
  select.props.onChange({ target: { value: "manager" } }); h.render();
  h.find(node => node.type === "input" && node.props.placeholder === "Enter Prakalpa name").props.onChange({ target: { value: "Draft name" } });
  select.props.onChange({ target: { value: "__create__" } });
  assert.match(h.render(), /Create a New Manager\?/); assert.match(h.render(), /Unsaved Prakalpa changes will be lost/); assert.equal(h.navigations.length, 0);
  const dialog = h.find(node => node.props.open === true && node.props.onOpenChange);
  dialog.props.onOpenChange(false); assert.match(h.render(), /value="Draft name"/);
  assert.equal(h.find(node => node.props.id === "assigned-manager").props.value, "manager");
  select.props.onChange({ target: { value: "__create__" } }); h.render();
  await h.button("Continue to User Management").props.onClick({ preventDefault() {} });
  assert.deepEqual(h.navigations, ["/user-management"]); assert.equal(h.submits(), 0);
});

test("unchanged records do not PUT; rejected saves retain values and show the actual safe conflict", async () => {
  const h = harness(async () => { throw { response: { status: 409, data: { message: "The previous Manager must retain at least one active Prakalpa." } } }; });
  h.render(); h.button("Edit").props.onClick(); h.render();
  assert.equal(h.button("Save Changes").props.disabled, true);
  await h.button("Save Changes").props.onClick(); assert.equal(h.submits(), 0);
  h.find(node => node.type === "input" && node.props.type === "email").props.onChange({ target: { value: "updated@example.test" } }); h.render();
  await h.button("Save Changes").props.onClick(); const html = h.render();
  assert.equal(h.submits(), 1); assert.match(html, /previous Manager must retain/); assert.match(html, /value="updated@example.test"/); assert.match(html, /Edit Prakalpa/);
});

test("duplicate clicks during an in-flight save produce one PUT", async () => {
  let resolve; const h = harness(() => new Promise(done => { resolve = done; }));
  h.render(); h.button("Edit").props.onClick(); h.render();
  h.find(node => node.type === "input" && node.props.type === "email").props.onChange({ target: { value: "updated@example.test" } }); h.render();
  const click = h.button("Save Changes").props.onClick;
  const pending = click(); await click(); assert.equal(h.submits(), 1); h.render(); assert.equal(h.button("Saving...").props.disabled, true);
  resolve(); await pending; await tick();
});

test("Prakalpa screen has no native popups or automatic focus/timer refreshes", () => {
  assert.doesNotMatch(source, /window\.(?:confirm|alert)|addEventListener\(|setInterval\(/);
});
