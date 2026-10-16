import test from "node:test";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import assert from "node:assert/strict";

import AuditFinding from "../models/AuditFinding.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import ConsolidatedFindingSourceClaim from "../models/ConsolidatedFindingSourceClaim.js";
import Report from "../models/Report.js";
import { assertConsolidatedAuditReadyForCompletion } from "../services/consolidatedCompletionGuard.js";

const original = {
  sources: AuditFinding.find,
  findings: ConsolidatedFinding.find,
  claims: ConsolidatedFindingSourceClaim.find,
  reports: Report.find,
};

test.after(() => {
  AuditFinding.find = original.sources;
  ConsolidatedFinding.find = original.findings;
  ConsolidatedFindingSourceClaim.find = original.claims;
  Report.find = original.reports;
});

const audit = { _id: "audit-1", workflowMode: "consolidated" };

const validClaim = {
  scheduledAudit: "audit-1",
  consolidatedFinding: "group-1",
  sourceFinding: "source-1",
  status: "active",
};

function setup({
  sources = ["source-1"],
  findings = [{
    _id: "group-1",
    status: "SUBMITTED",
    workflowStatus: "converted_to_report",
    sourceFindings: ["source-1"],
    report: "report-1",
  }],
  claims = [validClaim],
  reports = [{
    _id: "report-1",
    sourceConsolidatedFinding: "group-1",
  }],
} = {}) {
  const query = (data) => ({ select: async () => data });

  AuditFinding.find = () =>
    query(sources.map((_id) => ({ _id })));

  ConsolidatedFinding.find = () => query(findings);

  ConsolidatedFindingSourceClaim.find = () =>
    query(claims);

  Report.find = () => query(reports);
}

const check = () =>
  assertConsolidatedAuditReadyForCompletion(audit);

test("Valid claim permits completion", async () => {
  setup();
  await assert.doesNotReject(check());
});

test("Missing claim blocks completion", async () => {
  setup({ claims: [] });
  await assert.rejects(check(), { statusCode: 409 });
});

test("Claim referencing wrong group blocks completion", async () => {
  setup({
    claims: [{
      ...validClaim,
      consolidatedFinding: "wrong-group",
    }],
  });
  await assert.rejects(check(), { statusCode: 409 });
});

test("Claim referencing wrong audit blocks completion", async () => {
  setup({
    claims: [{
      ...validClaim,
      scheduledAudit: "wrong-audit",
    }],
  });
  await assert.rejects(check(), { statusCode: 409 });
});

test("Duplicate claims block completion", async () => {
  setup({ claims: [validClaim, { ...validClaim }] });
  await assert.rejects(check(), { statusCode: 409 });
});

test("Orphan claim blocks completion", async () => {
  setup({
    claims: [
      validClaim,
      {
        ...validClaim,
        sourceFinding: "orphan-source",
      },
    ],
  });
  await assert.rejects(check(), { statusCode: 409 });
});

test("Zero findings and zero claims permit completion", async () => {
  setup({
    sources: [],
    findings: [],
    claims: [],
    reports: [],
  });
  await assert.doesNotReject(check());
});

test("Orphan claim blocks zero-finding completion", async () => {
  setup({
    sources: [],
    findings: [],
    claims: [validClaim],
    reports: [],
  });
  await assert.rejects(check(), { statusCode: 409 });
});

test("Legacy audit bypasses claim checks", async () => {
  setup({ claims: [] });
  await assert.doesNotReject(
    assertConsolidatedAuditReadyForCompletion({
      ...audit,
      workflowMode: "legacy",
    })
  );
});


// Isolated fixture: an approved All Clear declaration exists.
// Production still verifies the real declaration in MongoDB.
const approvedAllClearQuery = () => ({
  session() { return this; },
  select: async () => ({ status: "approved" }),
  then(resolve, reject) {
    return Promise.resolve({ status: "approved" }).then(resolve, reject);
  },
});
const noActiveAllClearQuery = () => ({
  session: async () => null,
  then(resolve, reject) {
    return Promise.resolve(null).then(resolve, reject);
  },
});

const originalZeroFindingExists = ZeroFindingDeclaration.exists;
const originalZeroFindingFindOne = ZeroFindingDeclaration.findOne;

test.beforeEach(() => {
  ZeroFindingDeclaration.exists = noActiveAllClearQuery;
  ZeroFindingDeclaration.findOne = approvedAllClearQuery;
});

test.after(() => {
  ZeroFindingDeclaration.exists = originalZeroFindingExists;
  ZeroFindingDeclaration.findOne = originalZeroFindingFindOne;
});
