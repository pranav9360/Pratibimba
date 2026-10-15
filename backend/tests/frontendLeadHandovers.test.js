import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createHash, webcrypto } from "node:crypto";

const root = new URL("../../artifacts/pratibimba/", import.meta.url);
const requireFrontend = createRequire(new URL("package.json", root));
const ts = requireFrontend("typescript");
const read = path => readFileSync(new URL(`src/${path}`, root), "utf8");
const parse = path => ts.createSourceFile(path, read(path), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const walk = (node, visit) => { visit(node); ts.forEachChild(node, child => walk(child, visit)); };
const expression = (path, variable) => {
  const tree = parse(path); let found;
  walk(tree, node => {
    if (ts.isVariableDeclaration(node) && node.name.getText(tree) === variable) found = node.initializer.getText(tree);
  });
  assert.ok(found, variable); return found;
};
const evaluate = (source, context) => vm.runInContext(ts.transpile(`globalThis.result = ${source}`, {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
}), context);
const plain = value => JSON.parse(JSON.stringify(value));

test("Scheduled Audits permits only assigned Auditor/Lead own findings and preserves date/status locks", () => {
  const code = expression("pages/scheduled-audits.tsx", "canAddFindingsForAudit");
  const context = vm.createContext({ currentUser: { role: "auditor", name: "Lead" }, auditorSubmissionByAudit: { audit: false }, Date });
  evaluate(code, context);
  const audit = { id: "audit", leadAuditor: "Lead", auditors: ["Other"], status: "ongoing", startDate: "2020-01-01" };
  assert.equal(context.result(audit), true);
  assert.equal(context.result({ ...audit, leadAuditor: "Other" }), false);
  assert.equal(context.result({ ...audit, status: "completed" }), false);
  assert.equal(context.result({ ...audit, startDate: "2999-01-01" }), false);
  context.auditorSubmissionByAudit.audit = true; assert.equal(context.result(audit), false);
  context.auditorSubmissionByAudit.audit = false;
  context.currentUser.role = "admin"; assert.equal(context.result(audit), false);
});

test("confirmation freezes exact membership and retries use the frozen request, not refreshed findings", async () => {
  const tree = parse("pages/lead-findings.tsx"); let callback;
  walk(tree, node => {
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === "onClick" && node.initializer?.getText(tree).includes("setBatchRequest")) {
      callback = node.initializer.expression.getText(tree);
    }
  });
  assert.ok(callback);
  const sent = []; const context = vm.createContext({
    crypto: webcrypto, batchStatus: { findingIds: ["first"], confirmation: "snapshot" },
    setBatchRequest: value => { context.batchRequest = value; }, setBatchAcknowledged: () => {}, setBatchConfirm: () => {},
    activeAuditId: "audit", batchAcknowledged: true, processing: false,
    setProcessing: () => {}, setError: () => {}, setSuccess: () => {}, loadFindings: async () => {},
    submitLeadBatch: async (id, payload) => { sent.push(plain(payload)); return { approved: 1, discarded: 0 }; },
  });
  evaluate(callback, context); context.result();
  context.batchStatus.findingIds.push("late"); context.batchStatus.confirmation = "new snapshot";
  evaluate(expression("pages/lead-findings.tsx", "finalizeBatch"), context);
  await context.result(); await context.result();
  assert.deepEqual(sent[0].findingIds, ["first"]); assert.equal(sent[0].confirmation, "snapshot");
  assert.equal(sent[0].requestId, sent[1].requestId);
});

test("successful consolidated confirmation uses populated source IDs and the server's canonical fingerprint", async () => {
  const exports = {};
  const compiled = ts.transpileModule(read("services/auditFindingService.ts"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports, require: () => ({}), crypto: webcrypto, TextEncoder, Uint8Array });
  const drafts = [{ _id: "draft", title: "NC", status: "DRAFT", workflowStatus: "consolidated_draft", classification: "NC",
    updatedAt: "2026-01-01T00:00:00.000Z", sourceFindings: [{ _id: "source" }] }];
  const confirmed = await exports.confirmConsolidatedHandover(drafts);
  const canonical = [["draft", "consolidated_draft", "DRAFT", "NC", undefined, 0, null, drafts[0].updatedAt, "NC", ["source"]]];
  assert.equal(confirmed.confirmation, createHash("sha256").update(JSON.stringify(canonical)).digest("hex"));
  assert.deepEqual(plain(confirmed.findingIds), ["draft"]);
  drafts.push({ ...drafts[0], _id: "late" }); assert.deepEqual(plain(confirmed.findingIds), ["draft"]);
});

test("pending Auditors are informational; review, empty-set and final-closure guards remain", () => {
  const page = read("pages/lead-findings.tsx");
  assert.match(page, /Pending Auditors \(does not block handover\)/);
  assert.match(page, /disabled=\{processing \|\| batchStatus.pending > 0 \|\| \(batchStatus.submitted && batchStatus.findingIds.length === 0\)\}/);
  assert.doesNotMatch(page, /disabled=\{[^}]*missingAuditors/);
  assert.match(page, /batchStatus && !batchStatus.finalized/);
  assert.match(page, /batchStatus\?\.finalized === false && finding.workflowStatus === "submitted_to_lead"/);
  assert.match(page, /eligibleFindings.length > 0/); // Existing submitted-source consolidation requirement.
});
