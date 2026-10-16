import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import vm from "node:vm";

// Render the actual navigation, routes and page guards without a browser or API.
const frontend = resolve(fileURLToPath(new URL("../../artifacts/pratibimba/", import.meta.url)));
const requireFrontend = createRequire(`${frontend}/package.json`);
const ts = requireFrontend("typescript");
const React = requireFrontend("react");
const { renderToStaticMarkup } = requireFrontend("react-dom/server");
const managementPaths = ["/prakalpa-management", "/user-management", "/role-access"];
const load = (file, role, pathname = "/dashboard", cache = new Map()) => {
  const filename = resolve(frontend, "src", file);
  if (cache.has(filename)) return cache.get(filename);
  const source = readFileSync(filename, "utf8").replaceAll("import.meta.env.BASE_URL", '"/"');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  }, fileName: filename }).outputText;
  const context = {
    currentUser: { id: role, role, name: "Test User", email: "test@example.test" },
    notifications: [], refreshLiveData: async () => {},
  };
  const exports = {}; cache.set(filename, exports);
  const localRequire = name => {
    if (name.endsWith("app-context")) return { useApp: () => context, AppProvider: ({ children }) => children };
    if (name === "wouter") return {
      useLocation: () => [pathname, () => {}],
      Router: ({ children }) => children,
      Switch: ({ children }) => React.Children.toArray(children).find(child => child.props.path === pathname || !child.props.path),
      Route: ({ children }) => children,
      Redirect: () => null,
      Link: ({ children, href, ...props }) => React.createElement("a", { href, ...props }, children),
    };
    if (name.includes("/services/")) return {};
    if (name.endsWith(".jpeg")) return { default: "/logo.jpeg", __esModule: true };
    if (name.endsWith("account-center")) return { AccountCenter: () => null };
    if (name.includes("/pages/") && !/\/(user-management|prakalpa-management|role-access)$/.test(name)) {
      return { default: () => React.createElement("div", null, name), __esModule: true };
    }
    if (name.endsWith(".mjs")) return requireFrontend(resolve(dirname(filename), name));
    if (name.startsWith(".") || name.startsWith("@/")) {
      const base = name.startsWith("@/") ? resolve(frontend, "src", name.slice(2)) : resolve(dirname(filename), name);
      const target = [base + ".tsx", base + ".ts"].find(candidate => {
        try { readFileSync(candidate); return true; } catch { return false; }
      });
      if (!target) throw new Error(`Missing frontend module: ${name}`);
      return load(target.slice(`${frontend}/src/`.length), role, pathname, cache);
    }
    return requireFrontend(name);
  };
  vm.runInNewContext(compiled, { exports, require: localRequire, console }, { filename });
  return exports;
};
const render = (file, name, role, path) => renderToStaticMarkup(React.createElement(load(file, role, path)[name]));


test("desktop/mobile management grants Admin users/projects but keeps Role Access exclusive", () => {
  for (const [file, component] of [["components/side-nav.tsx","SideNav"],["components/top-nav.tsx","TopNav"]]) {
    const source=readFileSync(`${frontend}/src/${file}`,"utf8");
    for(const path of managementPaths){
      const start=source.indexOf(`href: "${path}"`); const roles=source.slice(start).match(/roles: (\[[^\]]*\])/);
      assert.deepEqual(JSON.parse(roles[1]),path==="/role-access"?["super_admin"]:["super_admin","admin"]);
    }
    const markup=render(file,component,"admin");
    if(component==="SideNav"){
      assert.ok(markup.includes('href="/user-management"'));assert.ok(markup.includes('href="/prakalpa-management"'));
      assert.equal(markup.includes('href="/role-access"'),false);
    }
  }
});
test("direct routes enforce the revised management matrix",()=>{
  for(const role of ["admin","super_admin","auditor","audit_coordinator","prakalpa_manager"]){
    for(const path of managementPaths){
      const allowed=role==="super_admin" || (role==="admin"&&path!=="/role-access");
      assert.equal(render("App.tsx","default",role,path).includes("Access Restricted"),!allowed,`${role}: ${path}`);
    }
  }
});
test("management page guards independently admit Admin, preserving protected-role UI",()=>{
  for(const file of ["user-management","prakalpa-management"]){
    assert.doesNotMatch(render(`pages/${file}.tsx`,"default","admin"),/Only [Ss]uperadmins can manage/);
  }
  assert.match(render("pages/role-access.tsx","default","admin"),/Only [Ss]uperadmins can manage/);
});
test("management grants do not impersonate operational roles",()=>{
  const {isRoleAllowed}=load("components/role-route-guard.tsx","admin");
  for(const role of ["admin","super_admin"]){
    for(const path of ["/audit-plan","/scheduled-audits","/all-reports","/audit-calendar"])
      assert.equal(render("App.tsx","default",role,path).includes("Access Restricted"),false);
  }
  assert.equal(isRoleAllowed("super_admin",["auditor"]),false);
  assert.equal(isRoleAllowed("super_admin",["audit_coordinator"]),false);
});
test("Help is routed outside authenticated AppProvider and header has no notification UI/polling",()=>{
  assert.match(render("App.tsx","default","", "/help"),/pages\/help/);
  const header=readFileSync(`${frontend}/src/components/top-nav.tsx`,"utf8");
  assert.doesNotMatch(header,/notifications|setInterval|getCoordinatorFindingSummaries|getReports/);
});
