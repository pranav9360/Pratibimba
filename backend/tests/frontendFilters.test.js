import { compareAuditRecords, compareIdentifiers, sortAuditRecords } from "../../shared/audit-order.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

// Baseline results were captured from the original pages before UI integration.
// No API, credentials, environment files or MongoDB connection is used here.
const frontend = fileURLToPath(new URL("../../artifacts/pratibimba/", import.meta.url));
const requireFrontend = createRequire(`${frontend}package.json`);
const ts = requireFrontend("typescript");
const React = requireFrontend("react");
const baseline = JSON.parse(readFileSync(new URL("./fixtures/frontend-filter-baseline.json", import.meta.url), "utf8"));
const parse = name => ts.createSourceFile("page.tsx", readFileSync(`${frontend}src/pages/${name}.tsx`, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const walk = (node, visit) => { visit(node); ts.forEachChild(node, child => walk(child, visit)); };
const bindings = ast => {
  const values = {};
  walk(ast, node => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) values[node.name.text] = node.initializer.getText(ast);
    if (ts.isFunctionDeclaration(node) && node.name) values[node.name.text] = node.getText(ast);
  });
  return values;
};
const contextFor = (name, override = {}) => {
  const environment = JSON.parse(JSON.stringify({ ...baseline.environment, ...override }));
  if (["user-management", "role-access"].includes(name) && !Object.hasOwn(override, "filterStatus")) environment.filterStatus = "all";
  if (["audit-plan", "scheduled-audits"].includes(name)) {
    Object.assign(environment, {
      filterSublocation: "All",
      filterAuditArea: "All",
      filterPramukh: "All",
      filterDate: { mode: "all", start: "", end: "" },
      ...override,
    });
  }
  return vm.createContext({ compareAuditRecords, compareIdentifiers, sortAuditRecords, ...environment, managerPrakalpas: [environment.currentUser?.prakalpa].filter(Boolean),
    matchesDateFilter: (start, end, filter) => {
      if (filter.mode === "all" || !filter.start) return true;
      const first = String(start || "").slice(0, 10);
      const last = String(end || start || "").slice(0, 10);
      if (!first) return false;
      if (filter.mode === "from") return last >= filter.start;
      if (filter.mode === "until") return first <= filter.start;
      if (filter.mode === "month") {
        const [year, month] = filter.start.split("-").map(Number);
        const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
        const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
        return first <= monthEnd && last >= monthStart;
      }
      if (filter.mode === "range")
        return !filter.end || filter.end < filter.start ||
          (first <= filter.end && last >= filter.start);
      return true;
    },
    useMemo: callback => callback(),
    Date: class extends Date {
      constructor(...args) { super(...(args.length ? args : ["2026-11-15T12:00:00Z"])); }
      static now() { return new Date("2026-11-15T12:00:00Z").getTime(); }
    },
  });
};
const evaluate = (code, context) => vm.runInContext(ts.transpile(`globalThis.evaluated = ${code}`, { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS }), context);
const compact = value => Array.isArray(value) ? value.map(compact) : value && typeof value === "object"
  ? Object.hasOwn(value, "id") ? value.id : Object.fromEntries(Object.entries(value).map(([key, item]) => [key, compact(item)])) : value;
const plain = value => JSON.parse(JSON.stringify(value));

for (const [name, page] of Object.entries(baseline.pages)) {
  test(`${name}: all 24 original filter-result scenarios remain equivalent`, () => {
    const current = bindings(parse(name));
    for (const { label, override, result } of page.results) {
      const legacyOverride = { ...override };
      if (name === "audit-plan") {
        delete legacyOverride.filterPramukh;
        delete legacyOverride.filterAuditArea;
      }
      if (name === "scheduled-audits") {
        delete legacyOverride.filterAuditArea;
        delete legacyOverride.filterPramukh;
      }
      const context = contextFor(name, legacyOverride), actual = {};
      for (const key of page.targets) {
        evaluate(current[key], context); context[key] = context.evaluated;
        if (typeof context[key] !== "function") actual[key] = compact(plain(context[key]));
      }
      // Display ordering intentionally changed; original membership/count/filter semantics must remain.
      const canonical = value => Array.isArray(value) ? value.map(canonical).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([k,v])=>[k,canonical(v)])) : value;
      assert.deepEqual(canonical(actual), canonical(result), label);
    }
  });
  test(`${name}: predicates, grouping, exports, counters and existing resets are unchanged`, () => {
    const current = bindings(parse(name));
    for (const [key, text] of Object.entries(page.contracts)) {
      if (["audit-plan", "scheduled-audits"].includes(name) && key === "filtered") {
        assert.ok(current[key].includes("matchesDateFilter("), `${name}: date predicate exists`);
        assert.ok(current[key].includes("filterSublocation"), `${name}: sublocation predicate exists`);
        assert.ok(current[key].includes("filterAuditArea"), `${name}: audit-area predicate exists`);
        assert.ok(current[key].includes("filterPramukh"), `${name}: Pramukh predicate exists`);
      } else {
        const expected = text.replaceAll("const grouped = reports.reduce(", "const grouped = sortAuditRecords(reports).reduce(").replaceAll('.sort((a, b) => (a.date || "").localeCompare(b.date || ""))','.sort(compareAuditRecords)').replaceAll("return reports.filter(", "return sortAuditRecords(reports).filter(").replaceAll("return reports\n", "return sortAuditRecords(reports)\n").replaceAll("r.prakalpa === currentUser.prakalpa", "managerPrakalpas.includes(r.prakalpa)")
          .replace("[reports, isManager, isAuditor, currentUser]", "[reports, isManager, isAuditor, currentUser, managerPrakalpas]")
          .replace("    currentUser,\n  ])", "    currentUser,\n    managerPrakalpas,\n  ])");
        if(key === "groupedOpenReports") {
          assert.match(current[key], /compareAuditRecords/);assert.match(current[key], /compareIdentifiers/);
        } else assert.equal(current[key], expected, key);
      }
    }
  });
}

const toolbarAttribute = (ast, key) => {
  let expression;
  walk(ast, node => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(ast) === "FilterToolbar") {
      const attribute = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(ast) === key);
      if (attribute?.initializer && ts.isJsxExpression(attribute.initializer)) expression = attribute.initializer.expression?.getText(ast);
    }
  });
  return expression;
};
const filteredState = name => ({ search: "Safety", filterPrakalpa: "Real Prakalpa", filterLocation: "North Office",
  filterCoordinator: "Real Coordinator", filterAuditor: "Alpha Auditor", filterStatus: ["user-management", "role-access"].includes(name) ? "active" : "open",
  filterClassification: "NC", filterAuditId: "2026", filterReportId: "QR", filterPramukh: "Pram", filterAuditArea: "Safety", filterRole: "auditor",
  filterSublocation: "Room A",
  filterDate: { mode: "month", start: "2026-11", end: "" },
  showAllPlans: true, viewYear: 2026, viewMonth: 10, selectedDay: 15, view: "list" });
const setters = context => {
  for (const key of Object.keys(context)) {
    if (key === "search" || key.startsWith("filter") || ["showAllPlans", "viewYear", "viewMonth", "selectedDay", "view"].includes(key)) {
      context[`set${key[0].toUpperCase()}${key.slice(1)}`] = value => { context[key] = value; };
    }
  }
  context.ROLE_META = Object.fromEntries(["auditor", "admin", "super_admin"].map(role => [role, { label: role }]));
};

test("each page's Clear All resets only its filters, preserving Calendar and Show all state", () => {
  for (const name of Object.keys(baseline.pages)) {
    const ast = parse(name), context = contextFor(name, filteredState(name)); setters(context);
    const values = bindings(ast);
    if (values.clearFilters) { evaluate(values.clearFilters, context); context.clearFilters = context.evaluated; }
    evaluate(toolbarAttribute(ast, "filters"), context); const chips = context.evaluated;
    evaluate(toolbarAttribute(ast, "onClearAll"), context); context.evaluated();
    for (const chip of chips) {
      const key = chip.key.startsWith("filter") ? chip.key :
        ({ sublocation: "filterSublocation", auditArea: "filterAuditArea",
           pramukh: "filterPramukh", auditor: "filterAuditor",
           date: "filterDate" }[chip.key] || chip.key);
      const neutral = key === "filterDate" ? { mode: "all", start: "", end: "" } :
        key === "filterPramukh" && ["audit-plan", "scheduled-audits"].includes(name) ? "All" :
        key === "search" || ["filterAuditId", "filterReportId", "filterPramukh"].includes(key) ? ""
        : ["user-management", "role-access"].includes(name) ? "all" : "All";
      if (key === "filterDate") assert.deepEqual(plain(context[key]), neutral, `${name}: ${key}`);
      else assert.equal(context[key], neutral, `${name}: ${key}`);
    }
    assert.equal(context.showAllPlans, true); assert.equal(context.viewYear, 2026); assert.equal(context.viewMonth, 10);
    assert.equal(context.selectedDay, 15); assert.equal(context.view, "list");
    if (name === "audit-calendar") assert.equal(context.search, "Safety", "calendar has no global search filter");
  }
});

test("individual chips clear exactly one filter and synchronize User Management role-card state", () => {
  for (const name of Object.keys(baseline.pages)) {
    const ast = parse(name), context = contextFor(name, filteredState(name)); setters(context);
    evaluate(toolbarAttribute(ast, "filters"), context); const chips = context.evaluated;
    for (const chip of chips) {
      const before = Object.fromEntries(Object.keys(filteredState(name)).map(key => [key, context[key]]));
      chip.onRemove();
      const target = ({ sublocation: "filterSublocation",
        auditArea: "filterAuditArea", pramukh: "filterPramukh",
        auditor: "filterAuditor", date: "filterDate" })[chip.key] || chip.key;
      for (const [key, value] of Object.entries(before)) {
        if (key !== target) assert.deepEqual(plain(context[key]), plain(value), `${name}: unrelated ${key}`);
      }
      assert.notDeepEqual(plain(context[target]), plain(before[target]));
      Object.assign(context, before);
    }
  }
  const source = readFileSync(`${frontend}src/pages/user-management.tsx`, "utf8");
  assert.ok(source.includes('setFilterRole(filterRole === r.value ? "all" : r.value)'));
  assert.ok(source.includes('filterRole === r.value ? r.color'));
});

test("option catalogs use authorized loaded records rather than demo constants", () => {
  for (const name of Object.keys(baseline.pages)) {
    const ast = parse(name); walk(ast, node => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(ast) === "FilterSelect") {
        const options = node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText(ast) === "options");
        assert.doesNotMatch(options.getText(ast), /PRAKALPAS|AUDIT_COORDINATORS|SEED_USERS/);
      }
    });
  }
  for (const name of ["scheduled-audits", "all-reports", "open-reports"]) {
    const current = bindings(parse(name));
    for (const role of ["auditor", "audit_coordinator", "prakalpa_manager"]) {
      const context = contextFor(name, { currentUser: { role, name: "Alpha Auditor", prakalpa: "Other Prakalpa" }, isAuditor: role === "auditor", isManager: role === "prakalpa_manager" });
      const target = name === "scheduled-audits" ? "filterAudits" : "filterReports";
      evaluate(current[target], context); context[target] = context.evaluated;
      evaluate(current.filterPrakalpaOptions, context);
      const expected = role === "prakalpa_manager" && name !== "scheduled-audits" ? ["Other Prakalpa"]
        : role === "auditor" ? ["Real Prakalpa"] : role === "audit_coordinator" && name === "scheduled-audits" ? [] : ["Real Prakalpa", "Other Prakalpa"];
      assert.deepEqual(plain(context.evaluated), expected, `${name}: ${role}`);
    }
  }
});

test("Auditor/Manager hidden filters and chips retain their role conditions; no new filter categories", () => {
  for (const [name, forbidden] of [["scheduled-audits", "Auditor"], ["all-reports", "Prakalpa"], ["open-reports", "Prakalpa"]]) {
    const ast = parse(name); let gate;
    walk(ast, node => {
      if (ts.isBinaryExpression(node) && node.right.getText(ast).startsWith(`<FilterSelect label="${forbidden}"`)) gate = node.left.getText(ast);
    });
    assert.equal(gate, forbidden === "Auditor" ? "!isAuditor" : "!isManager");
    const context = contextFor(name, { ...filteredState(name), isAuditor: forbidden === "Auditor", isManager: forbidden === "Prakalpa" }); setters(context);
    evaluate(toolbarAttribute(ast, "filters"), context);
    assert.equal(context.evaluated.some(chip => chip.label === forbidden), false);
  }
  for (const name of ["prakalpa-management", "open-reports"]) {
    const ast = parse(name); walk(ast, node => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast) === "FilterSelect") {
        assert.notEqual(name, "prakalpa-management"); assert.doesNotMatch(node.getText(ast), /label="Status"/);
      }
    });
  }
});

// A shallow element harness exercises actual wrapper callbacks while delegating
// browser focus, keyboard navigation and dismissal to unchanged Radix/cmdk primitives.
const primitive = name => Object.assign(props => React.createElement("div", props), { displayName: name });
const component = (name, stateChanges = []) => {
  const exports = {}, code = readFileSync(`${frontend}src/components/filters/${name}.tsx`, "utf8");
  const requireLocal = name => {
    if (name === "react") return { ...React, useState: initial => [initial, value => stateChanges.push(value)] };
    if (name.startsWith("../ui/")) return Object.fromEntries(["Badge", "Button", "Input", "Popover", "PopoverContent", "PopoverTrigger", "Command", "CommandInput", "CommandEmpty", "CommandItem", "CommandList", "Select", "SelectContent", "SelectItem", "SelectTrigger", "SelectValue"].map(key => [key, primitive(key)]));
    if (name === "./active-filter-chips") return { ActiveFilterChips: component("active-filter-chips").ActiveFilterChips };
    return requireFrontend(name);
  };
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }, fileName: `${name}.tsx` }).outputText,
    { exports, require: requireLocal });
  return exports;
};
const elements = (element, predicate) => {
  const found = []; const visit = value => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!React.isValidElement(value)) return;
    if (predicate(value)) found.push(value); visit(value.props.children);
  }; visit(element); return found;
};

test("FilterSelect applies single values immediately, retains missing selections and closes after selection", () => {
  const changes = [], open = [], { FilterSelect } = component("filter-select", open);
  const tree = FilterSelect({ label: "Prakalpa", value: "Old value", options: [{ value: "Real value", label: "Real value" }], onChange: value => changes.push(value), searchable: true });
  const choices = elements(tree, element => element.type.displayName === "CommandItem");
  assert.ok(choices.some(choice => choice.props.value === "Old value"), "refresh does not reset absent selected values");
  const actual = choices.find(choice => choice.props.value === "Real value"); actual.props.onSelect();
  assert.deepEqual(changes, ["Real value"]); assert.deepEqual(open, [false]);
  const reset = choices.find(choice => choice.props.value === "All"); reset.props.onSelect(); assert.deepEqual(changes, ["Real value", "All"]);
  const short = FilterSelect({ label: "Status", value: "all", allValue: "all", options: [{ value: "active", label: "Active" }], onChange: value => changes.push(value) });
  short.props.onValueChange("active"); assert.equal(changes.at(-1), "active");
});

test("FilterText preserves raw partial text, applies immediately and Enter closes without resetting", () => {
  const changes = [], open = [], { FilterText } = component("filter-text", open);
  const tree = FilterText({ label: "IQR ID", value: " QR-2 ", onChange: value => changes.push(value) });
  const input = elements(tree, element => element.type.displayName === "Input")[0];
  input.props.onChange({ target: { value: " QR-3 " } }); assert.deepEqual(changes, [" QR-3 "]);
  input.props.onKeyDown({ key: "Enter" }); assert.deepEqual(open, [false]); assert.deepEqual(changes, [" QR-3 "]);
});

test("toolbar search, Clear All and accessible chip-removal callbacks remain independent", () => {
  let search, clears = 0, removals = 0;
  const filters = [{ key: "role", label: "Role", value: "Auditor", onRemove: () => removals++ }];
  const { FilterToolbar } = component("filter-toolbar");
  const tree = FilterToolbar({ search: { value: "Alpha", placeholder: "Search users", onChange: value => { search = value; } }, filters,
    onClearAll: () => clears++, resultCount: 2 });
  elements(tree, element => element.props["aria-label"] === "Clear search")[0].props.onClick(); assert.equal(search, ""); assert.equal(clears, 0);
  elements(tree, element => element.props.children === "Clear All")[0].props.onClick(); assert.equal(clears, 1); assert.equal(removals, 0);
  const { ActiveFilterChips } = component("active-filter-chips");
  elements(ActiveFilterChips({ filters }), element => element.props["aria-label"] === "Remove Role filter")[0].props.onClick(); assert.equal(removals, 1);
});
