import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import AuditFinding from "../models/AuditFinding.js";
import ScheduledAudit from "../models/ScheduledAudit.js";

import {
  approveFindingAndSubmitToCoordinator,
  returnFindingToAuditor,
  convertFindingToReport,
} from "../services/auditFindingService.js";

const findingId = new mongoose.Types.ObjectId().toString();
const auditId = new mongoose.Types.ObjectId().toString();
const userId = new mongoose.Types.ObjectId().toString();

const lead = {
  _id: userId,
  name: "Assigned Lead",
  role: "auditor",
};

const otherAuditor = {
  _id: new mongoose.Types.ObjectId().toString(),
  name: "Other Auditor",
  role: "auditor",
};

const legacyLead = {
  ...lead,
  role: "lead_auditor",
};

const originalFindingLookup = AuditFinding.findById;
const originalFindingConditionalUpdate = AuditFinding.findOneAndUpdate;
const originalAuditLookup = ScheduledAudit.findById;

let currentAudit;
let currentFinding;
let saveCount;
let conditionalUpdateCount;
let lastApprovalFilter;

const createFinding = () => ({
  _id: findingId,
  scheduledAudit: auditId,
  workflowStatus: "submitted_to_lead",
  workflowHistory: [],
  submittedBy: userId,
  async save() {
    saveCount++;
  },
});

const reset = () => {
  saveCount = 0;
  conditionalUpdateCount = 0;
  lastApprovalFilter = null;
  currentFinding = createFinding();
  currentAudit = {
    _id: auditId,
    leadAuditor: "Assigned Lead",
    auditCoordinator: "Assigned Coordinator",
    auditors: ["Assigned Lead", "Other Auditor"],
    workflowMode: "legacy",
  };
};

AuditFinding.findById = async () => currentFinding;

AuditFinding.findOneAndUpdate = async (filter, update, options) => {
  conditionalUpdateCount++;
  lastApprovalFilter = filter;
  assert.equal(String(filter._id), String(findingId));
  assert.equal(filter.workflowStatus, "submitted_to_lead");
  assert.ok(Array.isArray(filter.$or));
  assert.equal(options.new, true);
  assert.equal(options.runValidators, true);
  if (currentFinding.workflowStatus !== "submitted_to_lead") return null;
  assert.ok(["approved_by_lead", "discarded_by_lead"].includes(update.$set.workflowStatus));
  assert.equal(update.$push.workflowHistory.toStatus, update.$set.workflowStatus);
  currentFinding.workflowStatus = update.$set.workflowStatus;
  currentFinding.workflowHistory.push(update.$push.workflowHistory);
  return currentFinding;
};

ScheduledAudit.findById = async () => currentAudit;

test.after(() => {
  AuditFinding.findById = originalFindingLookup;
  AuditFinding.findOneAndUpdate = originalFindingConditionalUpdate;
  ScheduledAudit.findById = originalAuditLookup;
});

test.beforeEach(reset);

test("Assigned lead can approve finding", async () => {
  const result =
    await approveFindingAndSubmitToCoordinator(
      findingId,
      { remarks: "Approved" },
      lead
    );

  assert.equal(result.workflowStatus, "approved_by_lead");
  assert.equal(saveCount, 0);
  assert.equal(conditionalUpdateCount, 1);
  assert.equal(lastApprovalFilter.workflowStatus, "submitted_to_lead");
  assert.equal(result.workflowHistory.length, 1);
});

test("Audits without a workflow mode preserve historical legacy approval", async () => {
  delete currentAudit.workflowMode;

  const result =
    await approveFindingAndSubmitToCoordinator(
      findingId,
      {},
      lead
    );

  assert.equal(result.workflowStatus, "approved_by_lead");
  assert.equal(saveCount, 0);
  assert.equal(conditionalUpdateCount, 1);
});

test("Assigned lead can discard a finding without forwarding it", async () => {
  const result = await approveFindingAndSubmitToCoordinator(findingId, { decision: "discard", remarks: "Not applicable" }, lead);
  assert.equal(result.workflowStatus, "discarded_by_lead");
  assert.equal(result.workflowHistory.length, 1);
  assert.equal(conditionalUpdateCount, 1);
});

test("Already decided finding cannot be approved again", async () => {
  currentFinding.workflowStatus = "approved_by_lead";
  await assert.rejects(approveFindingAndSubmitToCoordinator(findingId, {}, lead), { statusCode: 409 });
  assert.equal(conditionalUpdateCount, 0);
});

test("Consolidated audits cannot use legacy Lead Auditor approval", async () => {
  currentAudit.workflowMode = "consolidated";

  await assert.rejects(
    approveFindingAndSubmitToCoordinator(
      findingId,
      {},
      lead
    ),
    { statusCode: 409 }
  );

  assert.equal(saveCount, 0);
  assert.equal(currentFinding.workflowStatus, "submitted_to_lead");
});

test("Invalid workflow modes fail closed on legacy approval", async () => {
  currentAudit.workflowMode = "unknown";

  await assert.rejects(
    approveFindingAndSubmitToCoordinator(
      findingId,
      {},
      lead
    ),
    { statusCode: 409 }
  );

  assert.equal(saveCount, 0);
});

test("Consolidated audits cannot convert original findings into reports", async () => {
  currentAudit.workflowMode = "consolidated";
  currentFinding.workflowStatus = "submitted_to_coordinator";

  await assert.rejects(
    convertFindingToReport(findingId, {
      _id: userId,
      name: "Assigned Coordinator",
      role: "audit_coordinator",
    }),
    { statusCode: 409 }
  );

  assert.equal(saveCount, 0);
  assert.equal(currentFinding.workflowStatus, "submitted_to_coordinator");
});

test("Invalid workflow modes fail closed on original report conversion", async () => {
  currentAudit.workflowMode = null;
  currentFinding.workflowStatus = "submitted_to_coordinator";

  await assert.rejects(
    convertFindingToReport(findingId, {
      _id: userId,
      name: "Assigned Coordinator",
      role: "audit_coordinator",
    }),
    { statusCode: 409 }
  );

  assert.equal(saveCount, 0);
});

test("Unrelated auditor cannot approve finding", async () => {
  await assert.rejects(
    approveFindingAndSubmitToCoordinator(
      findingId,
      {},
      otherAuditor
    ),
    { statusCode: 403 }
  );

  assert.equal(saveCount, 0);
});

test("Assigned lead can return finding", async () => {
  const result = await returnFindingToAuditor(
    findingId,
    { remarks: "Please correct the evidence" },
    lead
  );

  assert.equal(result.workflowStatus, "returned_to_auditor");
  assert.equal(saveCount, 1);
  assert.equal(result.workflowHistory.length, 1);
});

test("Audits without a workflow mode retain legacy return behavior", async () => {
  delete currentAudit.workflowMode;

  const result = await returnFindingToAuditor(
    findingId,
    { remarks: "Please correct the evidence" },
    lead
  );

  assert.equal(result.workflowStatus, "returned_to_auditor");
  assert.equal(saveCount, 1);
});

test("Consolidated audits cannot use legacy Return to Auditor", async () => {
  currentAudit.workflowMode = "consolidated";

  await assert.rejects(
    returnFindingToAuditor(
      findingId,
      { remarks: "Please correct the evidence" },
      lead
    ),
    { statusCode: 409 }
  );

  assert.equal(saveCount, 0);
  assert.equal(currentFinding.workflowStatus, "submitted_to_lead");
});

test("Invalid workflow modes fail closed on Return to Auditor", async () => {
  currentAudit.workflowMode = "unknown";

  await assert.rejects(
    returnFindingToAuditor(
      findingId,
      { remarks: "Please correct the evidence" },
      lead
    ),
    { statusCode: 409 }
  );

  assert.equal(saveCount, 0);
  assert.equal(currentFinding.workflowStatus, "submitted_to_lead");
});

test("Unrelated auditor cannot return finding", async () => {
  await assert.rejects(
    returnFindingToAuditor(
      findingId,
      { remarks: "Incorrect" },
      otherAuditor
    ),
    { statusCode: 403 }
  );

  assert.equal(saveCount, 0);
});

test("Lead assignment on another audit grants no access", async () => {
  currentAudit.leadAuditor = "Someone Else";

  await assert.rejects(
    approveFindingAndSubmitToCoordinator(
      findingId,
      {},
      lead
    ),
    { statusCode: 403 }
  );

  assert.equal(saveCount, 0);
});

test("Obsolete permanent Lead Auditor role is rejected", async () => {
  await assert.rejects(
    approveFindingAndSubmitToCoordinator(
      findingId,
      {},
      legacyLead
    ),
    { statusCode: 403 }
  );

  assert.equal(saveCount, 0);
});
