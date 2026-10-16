import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';
import { after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import AuditFinding from "../models/AuditFinding.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import AuditorSubmission from "../models/AuditorSubmission.js";
import LeadBatchSubmission from "../models/LeadBatchSubmission.js";
import CoordinatorBatchClosure from "../models/CoordinatorBatchClosure.js";
import Report from "../models/Report.js";
import { getLeadBatchStatus, submitLeadBatchToCoordinator, submitAllAuditorFindings,
  generateCoordinatorBatchReports, createAuditFindingDraft, updateAuditFindingDraft, submitFindingToLead } from "../services/auditFindingService.js";

// Deterministic transactional persistence simulation. Never connects to MongoDB.
const originals = [];
const mock = (object, name, value) => { originals.push([object, name, object[name]]); object[name] = value; };
const q = value => ({ then: (ok, fail) => Promise.resolve(value).then(ok, fail),
  lean() { return this; }, session() { return this; }, sort() { return this; } });
const id = () => new mongoose.Types.ObjectId().toString();
const lead = { _id: id(), role: "auditor", name: "Lead" };
const coordinator = { _id: id(), role: "audit_coordinator", name: "Coordinator" };
let audit, findings, submissions, handover, closed, tail, failAppend, saves, onTransactionQueued;
const finding = (over = {}) => ({ _id: id(), scheduledAudit: audit._id, auditor: lead._id, submittedBy: lead._id,
  submittedByName: "Lead", status: "SUBMITTED", workflowStatus: "approved_by_lead", classification: "NC",
  leadReviewedAt: new Date(), workflowHistory: [], ...over,
  async save() { saves++; return this; } });
const matching = filter => findings.filter(f => (!filter.auditor || f.auditor === filter.auditor));
const request = async () => {
  const status = await getLeadBatchStatus(audit._id, lead);
  return { requestId: randomUUID(), findingIds: status.findingIds, confirmation: status.confirmation };
};

beforeEach(() => {
  for (const [object, name, value] of originals.splice(0).reverse()) object[name] = value;
  audit = { _id: id(), leadAuditor: "Lead", auditCoordinator: "Coordinator", auditors: ["A", "B"],
    workflowMode: "legacy", status: "ongoing", startDate: new Date(Date.now() - 86400000), workflowRevision: 0 };
  findings = []; submissions = []; handover = null; closed = false; tail = Promise.resolve(); failAppend = false; saves = 0; onTransactionQueued = null;
  mock(ZeroFindingDeclaration, "exists", () => q(null));
  mock(ScheduledAudit, "findById", () => q(audit));
  mock(ScheduledAudit, "updateOne", async () => { audit.workflowRevision++; return { modifiedCount: 1 }; });
  mock(AuditFinding, "find", filter => q(matching(filter)));
  mock(AuditFinding, "findById", value => q(findings.find(f => String(f._id) === String(value))));
  mock(AuditFinding, "create", async (payload, options) => { assert.ok(options.session); const created = finding(payload[0]); findings.push(created); return [created]; });
  mock(AuditFinding, "updateMany", async (filter, update) => {
    matching(filter).forEach(f => Object.assign(f, update.$set)); return { modifiedCount: matching(filter).length };
  });
  mock(AuditorSubmission, "find", () => q(submissions));
  mock(AuditorSubmission, "findOne", filter => q(submissions.find(s => s.auditor === filter.auditor)));
  mock(AuditorSubmission, "exists", filter => q(submissions.find(s => s.auditor === filter.auditor)));
  mock(AuditorSubmission, "create", async records => { submissions.push(...records); return records; });
  mock(LeadBatchSubmission, "findOne", () => q(handover));
  mock(LeadBatchSubmission, "exists", () => q(handover));
  mock(LeadBatchSubmission, "create", async records => { handover = { _id: id(), ...records[0] }; return [handover]; });
  mock(LeadBatchSubmission, "updateOne", async (filter, update, options) => {
    assert.ok(options.session); assert.equal(options.runValidators, true);
    if (failAppend) throw new Error("simulated handover persistence failure");
    (handover.supplementalHandovers ||= []).push(update.$push.supplementalHandovers);
    return { modifiedCount: 1 };
  });
  mock(CoordinatorBatchClosure, "exists", () => q(closed ? { _id: id() } : null));
  mock(CoordinatorBatchClosure, "findOne", () => q(closed ? { discardedCount: findings.length } : null));
  mock(CoordinatorBatchClosure, "create", async records => { closed = true; return records; });
  mock(Report, "countDocuments", () => q(findings.filter(f => f.workflowStatus === "converted_to_report").length));
  mock(mongoose, "startSession", async () => ({
    async withTransaction(operation) {
      const previous = tail; let release;
      tail = new Promise(resolve => { release = resolve; });
      onTransactionQueued?.();
      await previous;
      const snapshot = { findings: findings.map(f => ({ ...f, workflowHistory: [...f.workflowHistory] })),
        handover: handover && structuredClone(handover), submissions: [...submissions], closed, saves };
      try { return await operation(); }
      catch (error) { findings = snapshot.findings; handover = snapshot.handover;
        submissions = snapshot.submissions; closed = snapshot.closed; saves = snapshot.saves; throw error; }
      finally { release(); }
    }, async endSession() {},
  }));
});
after(() => { for (const [object, name, value] of originals.reverse()) object[name] = value; });

for (const count of [0, 1, 2]) {
  test(`Lead plus ${count} of two assigned Auditors can forward; pending drafts do not block`, async () => {
    findings.push(finding(), finding({ auditor: id(), status: "DRAFT", workflowStatus: "auditor_draft" }));
    for (const name of ["A", "B"].slice(0, count)) {
      submissions.push({ auditorName: name }); findings.push(finding({ submittedByName: name, auditor: id() }));
    }
    const before = await getLeadBatchStatus(audit._id, lead);
    const result = await submitLeadBatchToCoordinator(audit._id, lead, await request());
    assert.equal(result.approved, count + 1);
    assert.equal(before.missingAuditors.length, 2 - count);
    assert.equal(submissions.length, count); // Never manufacture No Findings submissions.
    assert.equal(findings.at(1).workflowStatus, "auditor_draft");
    assert.equal(handover.initialHandover.findingIds.length, count + 1);
  });
}

test("Lead not in auditors can create, edit and finally submit their own originals", async () => {
  const own = await createAuditFindingDraft(audit._id, { description: "Own original", classification: "NC" }, lead);
  await updateAuditFindingDraft(own._id, { description: "Own correction", classification: "OFI" }, lead);
  await submitAllAuditorFindings(audit._id, lead);
  assert.equal(own.workflowStatus, "submitted_to_lead"); assert.equal(own.classification, "OFI");
  assert.equal(own.auditor, lead._id); assert.equal(submissions.length, 1);
  await assert.rejects(submitAllAuditorFindings(audit._id, lead), { statusCode: 409 });
});

test("all currently submitted findings require review", async () => {
  findings.push(finding(), finding({ workflowStatus: "submitted_to_lead" }));
  await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, await request()), { statusCode: 409 });
  assert.equal(handover, null); assert.equal(saves, 0);
});

test("supplements preserve earlier records, original text, classifications and source membership", async () => {
  findings.push(finding({ findings: "Original", proofFiles: ["evidence:original"] }));
  await submitLeadBatchToCoordinator(audit._id, lead, await request());
  const first = JSON.stringify(findings[0]); const initial = JSON.stringify(handover.initialHandover);
  findings.push(finding({ classification: "OFI" }), finding({ workflowStatus: "discarded_by_lead" }));
  const supplement = await request(); await submitLeadBatchToCoordinator(audit._id, lead, supplement);
  assert.equal(JSON.stringify(findings[0]), first); assert.equal(JSON.stringify(handover.initialHandover), initial);
  assert.equal(handover.supplementalHandovers.length, 1);
  assert.equal(handover.supplementalHandovers[0].discardedCount, 1);
  assert.deepEqual((await getLeadBatchStatus(audit._id, lead)).findingIds, []);
  assert.equal((await submitLeadBatchToCoordinator(audit._id, lead, supplement)).alreadySubmitted, true);
});

test("concurrent retries of the same request create one handover", async () => {
  findings.push(finding()); const confirmed = await request();
  const results = await Promise.all([submitLeadBatchToCoordinator(audit._id, lead, confirmed), submitLeadBatchToCoordinator(audit._id, lead, confirmed)]);
  assert.equal(results.filter(r => r.alreadySubmitted).length, 1); assert.equal(saves, 1);
  assert.equal(handover.supplementalHandovers?.length || 0, 0);
});

test("competing request IDs cannot forward the same findings twice", async () => {
  findings.push(finding()); const confirmed = await request();
  const results = await Promise.allSettled([submitLeadBatchToCoordinator(audit._id, lead, confirmed),
    submitLeadBatchToCoordinator(audit._id, lead, { ...confirmed, requestId: randomUUID() })]);
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(results.find(r => r.status === "rejected").reason.statusCode, 409);
});

for (const change of ["arrival", "revision", "request reuse"]) {
  test(`${change} cannot silently change a confirmed handover`, async () => {
    findings.push(finding()); const confirmed = await request();
    if (change === "arrival") findings.push(finding());
    if (change === "revision") findings[0].leadEditedCopy = { revision: 1 };
    if (change === "request reuse") { await submitLeadBatchToCoordinator(audit._id, lead, confirmed); confirmed.confirmation = "a".repeat(64); }
    await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, confirmed), { statusCode: 409 });
  });
}

test("failed supplemental append rolls back finding transitions atomically", async () => {
  findings.push(finding()); await submitLeadBatchToCoordinator(audit._id, lead, await request());
  findings.push(finding()); const confirmed = await request(); failAppend = true;
  await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, confirmed), /persistence failure/);
  assert.equal(findings[1].workflowStatus, "approved_by_lead"); assert.equal(handover.supplementalHandovers?.length || 0, 0);
});

test("unauthorized roles and wrong Lead assignment cannot forward", async () => {
  findings.push(finding()); const confirmed = await request();
  for (const user of [{ ...lead, role: "admin" }, { ...lead, name: "Other" }]) {
    await assert.rejects(submitLeadBatchToCoordinator(audit._id, user, confirmed), { statusCode: 403 });
  }
  assert.equal(handover, null);
});

test("old count-only records remain compatible; ambiguous discarded membership fails explicitly", async () => {
  handover = { _id: id(), scheduledAudit: audit._id, submittedAt: new Date(), approvedCount: 1, discardedCount: 0 };
  findings.push(finding({ workflowStatus: "submitted_to_coordinator" }), finding());
  await submitLeadBatchToCoordinator(audit._id, lead, await request());
  assert.equal(handover.approvedCount, 1); assert.equal(handover.supplementalHandovers.length, 1);
  findings.push(finding({ workflowStatus: "discarded_by_lead", leadReviewedAt: null }));
  await assert.rejects(getLeadBatchStatus(audit._id, lead), /reconciliation/);
});

test("MongoDB document-size guard rejects growth before any finding is forwarded", async () => {
  findings.push(finding()); const confirmed = await request();
  // Use real BSON measurement, without allocating hundreds of thousands of test objects.
  handover = { _id: id(), submittedAt: new Date(), initialHandover: { findingIds: [] },
    supplementalHandovers: [{ requestId: "x".repeat(16 * 1024 * 1024), findingIds: [] }] };
  await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, confirmed), { statusCode: 413 });
  assert.equal(saves, 0); assert.equal(handover.supplementalHandovers.length, 1);
});

test("Coordinator closure retains report prerequisites and blocks subsequent submissions", async () => {
  findings.push(finding({ workflowStatus: "discarded_by_lead" }));
  await submitLeadBatchToCoordinator(audit._id, lead, await request());
  audit.status = "completed";
  assert.equal((await generateCoordinatorBatchReports(audit._id, coordinator)).closed, true);
  audit.status = "ongoing"; // Closure remains authoritative even if a schedule is later reopened.
  findings.push(finding()); const confirmed = await request();
  await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, confirmed), { statusCode: 409 });
  await assert.rejects(submitAllAuditorFindings(audit._id, lead), { statusCode: 409 });
});

test("unresolved drafts still block Coordinator reports, although not Lead handover", async () => {
  findings.push(finding({ workflowStatus: "discarded_by_lead" }), finding({ status: "DRAFT", workflowStatus: "auditor_draft" }));
  await submitLeadBatchToCoordinator(audit._id, lead, await request()); audit.status = "completed";
  await assert.rejects(generateCoordinatorBatchReports(audit._id, coordinator), /Unresolved/); assert.equal(closed, false);
});

test("the one-document-per-audit unique index is unchanged and new metadata is optional", () => {
  assert.ok(LeadBatchSubmission.schema.indexes().some(([key, options]) => key.scheduledAudit === 1 && options.unique));
  const historical = new LeadBatchSubmission({ scheduledAudit: audit._id, leadAuditor: lead._id, approvedCount: 1, discardedCount: 0 });
  assert.equal(historical.validateSync(), undefined); assert.equal(historical.initialHandover, undefined);
});


test("final closure racing another handover commits closure without a duplicate handover", async () => {
  findings.push(finding({ workflowStatus: "discarded_by_lead" }));
  await submitLeadBatchToCoordinator(audit._id, lead, await request());
  audit.status = "completed";
  // A legacy direct submission may target a completed schedule until final closure.
  // Final closure itself must use the barrier, independently of that date/status policy.
  const first = generateCoordinatorBatchReports(audit._id, coordinator);
  const second = submitLeadBatchToCoordinator(audit._id, lead, {
    requestId: randomUUID(), findingIds: [id()], confirmation: "a".repeat(64),
  });
  const results = await Promise.allSettled([first, second]);
  assert.equal(results[0].status, "fulfilled"); assert.equal(results[1].status, "rejected");
  assert.equal(results[1].reason.statusCode, 409); assert.equal(closed, true);
  assert.equal(handover.supplementalHandovers?.length || 0, 0);
});


test("empty initial handover is rejected in favor of All Clear; empty supplements still reject", async () => {
  const empty = await request();
  await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, empty), { statusCode: 409 });
  assert.equal(handover, null); assert.equal(submissions.length, 0);
  findings.push(finding());
  const confirmed = await request();
  await submitLeadBatchToCoordinator(audit._id, lead, confirmed);
  assert.equal((await submitLeadBatchToCoordinator(audit._id, lead, confirmed)).alreadySubmitted, true);
  await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, await request()), { statusCode: 409 });
});

test("historical discard counts cannot silently hide inconsistent membership", async () => {
  handover = { _id: id(), submittedAt: new Date(), approvedCount: 0, discardedCount: 1 };
  await assert.rejects(getLeadBatchStatus(audit._id, lead), /reconciliation/);
});

test("Lead handover respects the existing audit start-date restriction", async () => {
  findings.push(finding()); const confirmed = await request(); audit.startDate = new Date("2999-01-01");
  await assert.rejects(submitLeadBatchToCoordinator(audit._id, lead, confirmed), { statusCode: 403 });
  assert.equal(handover, null);
});


test("an Auditor submission queued while final closure commits is rejected under the shared lock", async () => {
  findings.push(finding({ workflowStatus: "discarded_by_lead" }));
  await submitLeadBatchToCoordinator(audit._id, lead, await request()); audit.status = "completed";
  let releaseCount, signalCount, signalQueued;
  const countEntered = new Promise(resolve => { signalCount = resolve; });
  const countReleased = new Promise(resolve => { releaseCount = resolve; });
  const writerQueued = new Promise(resolve => { signalQueued = resolve; });
  mock(Report, "countDocuments", () => ({ session: async () => { signalCount(); await countReleased; return 0; } }));
  const closure = generateCoordinatorBatchReports(audit._id, coordinator);
  await countEntered;
  onTransactionQueued = signalQueued;
  const writer = submitFindingToLead({ scheduledAudit: audit._id, auditArea: "Production", findings: "Late finding",
    severity: "non_conformance", visitDate: audit.startDate, visitTime: "10:00" }, lead);
  // Install a rejection handler before unblocking closure to avoid an unhandled rejection.
  const rejected = assert.rejects(writer, { statusCode: 409 });
  await writerQueued; releaseCount();
  await closure; await rejected;
  assert.equal(closed, true); assert.equal(findings.length, 1); assert.equal(findings[0].workflowStatus, "discarded_by_lead");
});
