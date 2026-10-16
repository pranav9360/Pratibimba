import test from "node:test";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import assert from "node:assert/strict";

import AuditFinding from "../models/AuditFinding.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import Report from "../models/Report.js";
import ConsolidatedFindingSourceClaim from "../models/ConsolidatedFindingSourceClaim.js";
import { assertConsolidatedAuditReadyForCompletion } from "../services/consolidatedCompletionGuard.js";

const original = {
  sources: AuditFinding.find,
  consolidated: ConsolidatedFinding.find,
  reports: Report.find,
  claims: ConsolidatedFindingSourceClaim.find,
};

const audit = {
  _id: "audit-1",
  workflowMode: "consolidated",
};

const source = (id) => ({ _id: id });

const finding = (id, sourceIds, overrides = {}) => ({
  _id: id,
  status: "SUBMITTED",
  workflowStatus: "converted_to_report",
  sourceFindings: sourceIds,
  report: `report-${id}`,
  ...overrides,
});

const report = (id) => ({
  _id: `report-${id}`,
  sourceConsolidatedFinding: id,
});

function mockData(sources = [], findings = [], reports = [], claims = null) {
  const effectiveClaims = claims ?? findings.flatMap((finding) =>
    (finding.sourceFindings || []).map((sourceFinding) => ({
      scheduledAudit: audit._id,
      consolidatedFinding: finding._id,
      sourceFinding,
      status: "active",
    }))
  );

  ConsolidatedFindingSourceClaim.find = () => ({
    select: async () => effectiveClaims,
  });

  AuditFinding.find = () => ({
    select: async () => sources,
  });

  ConsolidatedFinding.find = () => ({
    select: async () => findings,
  });

  Report.find = () => ({
    select: async () => reports,
  });
}

test.after(() => {
  AuditFinding.find = original.sources;
  ConsolidatedFinding.find = original.consolidated;
  Report.find = original.reports;
  ConsolidatedFindingSourceClaim.find = original.claims;
});

test("Legacy audits bypass consolidated completion checks", async () => {
  mockData();
  await assert.doesNotReject(
    assertConsolidatedAuditReadyForCompletion({
      ...audit,
      workflowMode: "legacy",
    })
  );
});

test("Zero findings allow consolidated audit completion", async () => {
  mockData();
  await assert.doesNotReject(
    assertConsolidatedAuditReadyForCompletion(audit)
  );
});

test("Submitted originals without consolidation block completion", async () => {
  mockData([source("source-1")]);

  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 }
  );
});

test("Draft consolidated findings block completion", async () => {
  mockData(
    [source("source-1")],
    [
      finding("group-1", ["source-1"], {
        status: "DRAFT",
        workflowStatus: "consolidated_draft",
        report: null,
      }),
    ]
  );

  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 }
  );
});

test("Submitted consolidated findings without IQR block completion", async () => {
  mockData(
    [source("source-1")],
    [
      finding("group-1", ["source-1"], {
        workflowStatus: "submitted_to_coordinator",
        report: null,
      }),
    ]
  );

  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 }
  );
});

test("Unassigned submitted originals block completion", async () => {
  mockData(
    [source("source-1"), source("source-2")],
    [finding("group-1", ["source-1"])],
    [report("group-1")]
  );

  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 }
  );
});

test("Duplicate source assignments block completion", async () => {
  mockData(
    [source("source-1")],
    [
      finding("group-1", ["source-1"]),
      finding("group-2", ["source-1"]),
    ],
    [report("group-1"), report("group-2")]
  );

  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 }
  );
});

test("Missing official IQR record blocks completion", async () => {
  mockData(
    [source("source-1")],
    [finding("group-1", ["source-1"])],
    []
  );

  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 }
  );
});

test("Incorrect IQR reference blocks completion", async () => {
  mockData(
    [source("source-1")],
    [finding("group-1", ["source-1"])],
    [{
      _id: "wrong-report",
      sourceConsolidatedFinding: "group-1",
    }]
  );

  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 }
  );
});

test("Fully converted consolidated findings allow completion", async () => {
  mockData(
    [source("source-1"), source("source-2")],
    [finding("group-1", ["source-1", "source-2"])],
    [report("group-1")]
  );

  await assert.doesNotReject(
    assertConsolidatedAuditReadyForCompletion(audit)
  );
});

test("Multiple fully converted groups allow completion", async () => {
  mockData(
    [source("source-1"), source("source-2")],
    [
      finding("group-1", ["source-1"]),
      finding("group-2", ["source-2"]),
    ],
    [report("group-1"), report("group-2")]
  );

  await assert.doesNotReject(
    assertConsolidatedAuditReadyForCompletion(audit)
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
