import test from "node:test";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import AuditFinding from "../models/AuditFinding.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import AuditorSubmission from "../models/AuditorSubmission.js";
import CoordinatorBatchClosure from "../models/CoordinatorBatchClosure.js";
import auditFindingRoutes from "../routes/auditFindingRoutes.js";

import {
  createAuditFindingDraft,
  updateAuditFindingDraft,
  submitAuditFindingDraft,
  submitFindingToLead,
  convertFindingToReport,
} from "../services/auditFindingService.js";

const originalAuditFindingCreate = AuditFinding.create;
const originalAuditFindingFindById = AuditFinding.findById;
const originalScheduledFindById = ScheduledAudit.findById;
const originalReportFind = Report.find;
const originalReportFindOne = Report.findOne;
const originalReportExists = Report.exists;
const originalReportCreate = Report.create;
const originalSubmissionExists = AuditorSubmission.exists;

const query = value => ({ then: (resolve, reject) => Promise.resolve(value).then(resolve, reject), session: async () => value });
const originalStartSessionDefault = mongoose.startSession;
const originalAuditUpdateOne = ScheduledAudit.updateOne;
const originalClosureExists = CoordinatorBatchClosure.exists;

const makeUser = (
  over = {}
) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  name: "Auditor One",
  role: "auditor",
  ...over,
});

const makeAudit = (
  over = {}
) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  auditPlan: new mongoose.Types.ObjectId().toString(),
  iqaNumber: "IQA-2026-001",
  prakalpa: "Prakalpa One",
  location: "Pune",
  sublocation: "",
  auditCoordinator: "Assigned Coordinator",
  leadAuditor: "Assigned Lead",
  workflowMode: "legacy",
  auditors: ["Assigned Lead", "Auditor One"],
  auditAreas: ["Production"],
  startDate: new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ),
  ...over,
});

const restoreMocks = () => {
  AuditFinding.create = originalAuditFindingCreate;
  AuditFinding.findById = originalAuditFindingFindById;
  ScheduledAudit.findById = originalScheduledFindById;
  Report.find = originalReportFind;
  Report.findOne = originalReportFindOne;
  Report.exists = originalReportExists;
  Report.create = originalReportCreate;
  AuditorSubmission.exists = originalSubmissionExists;
  mongoose.startSession = originalStartSessionDefault;
  ScheduledAudit.updateOne = originalAuditUpdateOne;
  CoordinatorBatchClosure.exists = originalClosureExists;
};

test.after(() => {
  restoreMocks();
});

test.beforeEach(() => {
  restoreMocks();
  AuditorSubmission.exists = () => query(null);
  CoordinatorBatchClosure.exists = () => query(null);
  ScheduledAudit.updateOne = async () => ({ modifiedCount: 1 });
  mongoose.startSession = async () => ({ withTransaction: async fn => fn(), endSession: async () => {} });
});

test("Assigned Auditor can create a draft", async () => {
  const audit = makeAudit({
    auditors: ["Auditor One"],
  });
  const user = makeUser({
    name: "Auditor One",
  });

  AuditFinding.create = async ([payload], options) => {
    assert.ok(options.session);
    return [{ ...payload, _id: new mongoose.Types.ObjectId().toString() }];
  };
  ScheduledAudit.findById = () => query(audit);

  const result = await createAuditFindingDraft(
    audit._id,
    {
      description: "Observed issue",
      classification: "NC",
    },
    user
  );

  assert.equal(result.status, "DRAFT");
  assert.equal(result.workflowStatus, "auditor_draft");
  assert.equal(String(result.auditor), String(user._id));
});


test("Completed consolidated audit rejects Auditor draft creation", async () => {
  const audit = makeAudit({
    workflowMode: "consolidated",
    status: "completed",
  });
  const user = makeUser();
  let created = false;

  ScheduledAudit.findById = () => query(audit);
  AuditFinding.create = async () => {
    created = true;
    throw new Error("Creation must not be reached");
  };

  await assert.rejects(
    createAuditFindingDraft(
      audit._id,
      { description: "Late finding", classification: "NC" },
      user
    ),
    { statusCode: 409 }
  );

  assert.equal(created, false);
});

test("Completed consolidated audit rejects Auditor draft editing", async () => {
  const audit = makeAudit({
    workflowMode: "consolidated",
    status: "completed",
  });
  const user = makeUser();
  let saved = false;

  const finding = {
    _id: new mongoose.Types.ObjectId().toString(),
    scheduledAudit: audit._id,
    status: "DRAFT",
    workflowStatus: "auditor_draft",
    auditor: user._id,
    submittedBy: user._id,
    async save() { saved = true; },
  };

  ScheduledAudit.findById = () => query(audit);
  AuditFinding.findById = () => query(finding);

  await assert.rejects(
    updateAuditFindingDraft(
      finding._id,
      { description: "Late edit" },
      user
    ),
    { statusCode: 409 }
  );

  assert.equal(saved, false);
});

test("Completed consolidated audit rejects Auditor draft submission", async () => {
  const audit = makeAudit({
    workflowMode: "consolidated",
    status: "completed",
  });
  const user = makeUser();
  let saved = false;

  const finding = {
    _id: new mongoose.Types.ObjectId().toString(),
    scheduledAudit: audit._id,
    status: "DRAFT",
    workflowStatus: "auditor_draft",
    auditor: user._id,
    submittedBy: user._id,
    async save() { saved = true; },
  };

  ScheduledAudit.findById = () => query(audit);
  AuditFinding.findById = () => query(finding);

  await assert.rejects(
    submitAuditFindingDraft(finding._id, user),
    { statusCode: 409 }
  );

  assert.equal(saved, false);
  assert.equal(finding.status, "DRAFT");
});

test("Consolidated draft submission uses the transaction barrier", async () => {
  const audit = makeAudit({
    workflowMode: "consolidated",
    status: "ongoing",
  });

  const user = makeUser();
  const findingId = new mongoose.Types.ObjectId().toString();
  const sessionToken = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  };

  const finding = {
    _id: findingId,
    scheduledAudit: audit._id,
    auditor: user._id,
    submittedBy: user._id,
    status: "DRAFT",
    workflowStatus: "auditor_draft",
    async save(options) {
      assert.equal(options.session, sessionToken);
      return this;
    },
  };

  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = ScheduledAudit.findOneAndUpdate;

  try {
    ScheduledAudit.findById = () => query(audit);

    let findingReads = 0;

    AuditFinding.findById = () => {
      findingReads += 1;

      if (findingReads === 1) {
        return Promise.resolve(finding);
      }

      return {
        session: async (session) => {
          assert.equal(session, sessionToken);
          return finding;
        },
      };
    };

    ScheduledAudit.findOneAndUpdate = async (
      filter,
      update,
      options
    ) => {
      assert.equal(String(filter._id), String(audit._id));
      assert.equal(filter.workflowMode, "consolidated");
      assert.deepEqual(filter.status, { $ne: "completed" });
      assert.deepEqual(update, {
        $inc: { workflowRevision: 1 },
      });
      assert.equal(options.session, sessionToken);
      return audit;
    };

    mongoose.startSession = async () => sessionToken;

    const result = await submitAuditFindingDraft(
      findingId,
      user
    );

    assert.equal(result.status, "SUBMITTED");
    assert.equal(result.workflowStatus, "submitted_to_lead");
    assert.equal(findingReads, 2);
  } finally {
    mongoose.startSession = originalStartSession;
    ScheduledAudit.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("Consolidated draft submission rejects completion at the barrier", async () => {
  const audit = makeAudit({
    workflowMode: "consolidated",
    status: "ongoing",
  });

  const user = makeUser();
  const finding = {
    _id: new mongoose.Types.ObjectId().toString(),
    scheduledAudit: audit._id,
    auditor: user._id,
    submittedBy: user._id,
    status: "DRAFT",
    workflowStatus: "auditor_draft",
    async save() {
      throw new Error("Submission must not be saved");
    },
  };

  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = ScheduledAudit.findOneAndUpdate;

  try {
    ScheduledAudit.findById = () => query(audit);
    AuditFinding.findById = () => query(finding);

    ScheduledAudit.findOneAndUpdate = async () => null;

    mongoose.startSession = async () => ({
      withTransaction: async (operation) => operation(),
      endSession: async () => {},
    });

    await assert.rejects(
      submitAuditFindingDraft(finding._id, user),
      { statusCode: 409 }
    );

    assert.equal(finding.status, "DRAFT");
  } finally {
    mongoose.startSession = originalStartSession;
    ScheduledAudit.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("Direct consolidated submission uses the transaction barrier", async () => {
  const audit = makeAudit({
    workflowMode: "consolidated",
    status: "ongoing",
  });

  const user = makeUser();
  const session = {
    withTransaction: async (operation) => operation(),
    endSession: async () => {},
  };

  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = ScheduledAudit.findOneAndUpdate;

  let createdPayload;

  try {
    ScheduledAudit.findById = () => query(audit);

    ScheduledAudit.findOneAndUpdate = async (
      filter,
      update,
      options
    ) => {
      assert.equal(String(filter._id), String(audit._id));
      assert.equal(filter.workflowMode, "consolidated");
      assert.deepEqual(filter.status, { $ne: "completed" });
      assert.deepEqual(update, {
        $inc: { workflowRevision: 1 },
      });
      assert.equal(options.session, session);
      return audit;
    };

    mongoose.startSession = async () => session;

    AuditFinding.create = async (documents, options) => {
      assert.ok(Array.isArray(documents));
      assert.equal(options.session, session);
      createdPayload = documents[0];
      return [{ ...createdPayload, _id: new mongoose.Types.ObjectId() }];
    };

    const result = await submitFindingToLead(
      {
        scheduledAudit: audit._id,
        auditArea: "Production",
        severity: "non_conformance",
        findings: "Observed direct finding",
        visitDate: new Date(),
        visitTime: "10:00",
      },
      user
    );

    assert.equal(result.status, "SUBMITTED");
    assert.equal(result.workflowStatus, "submitted_to_lead");
    assert.equal(String(createdPayload.scheduledAudit), String(audit._id));
    assert.equal(createdPayload.leadAuditor, "Assigned Lead");
  } finally {
    mongoose.startSession = originalStartSession;
    ScheduledAudit.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("Direct consolidated submission rejects completed audit at barrier", async () => {
  const audit = makeAudit({
    workflowMode: "consolidated",
    status: "ongoing",
  });

  const user = makeUser();
  const originalStartSession = mongoose.startSession;
  const originalFindOneAndUpdate = ScheduledAudit.findOneAndUpdate;

  let created = false;

  try {
    ScheduledAudit.findById = () => query(audit);
    ScheduledAudit.findOneAndUpdate = async () => null;

    mongoose.startSession = async () => ({
      withTransaction: async (operation) => operation(),
      endSession: async () => {},
    });

    AuditFinding.create = async () => {
      created = true;
      throw new Error("Creation must not be reached");
    };

    await assert.rejects(
      submitFindingToLead(
        {
          scheduledAudit: audit._id,
          auditArea: "Production",
          severity: "non_conformance",
          findings: "Late finding",
          visitDate: new Date(),
          visitTime: "10:00",
        },
        user
      ),
      { statusCode: 409 }
    );

    assert.equal(created, false);
  } finally {
    mongoose.startSession = originalStartSession;
    ScheduledAudit.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("Unassigned Auditor cannot create a draft", async () => {
  const audit = makeAudit({
    auditors: ["Somebody Else"],
  });
  const user = makeUser({
    name: "Auditor One",
  });

  ScheduledAudit.findById = () => query(audit);

  await assert.rejects(
    createAuditFindingDraft(
      audit._id,
      {
        description: "Observed issue",
        classification: "NC",
      },
      user
    ),
    { statusCode: 403 }
  );
});

test("Auditor cannot edit another Auditor's draft", async () => {
  const audit = makeAudit({
    auditors: ["Auditor One"],
  });
  const owner = makeUser({
    _id: new mongoose.Types.ObjectId().toString(),
    name: "Other Auditor",
  });
  const user = makeUser({
    name: "Auditor One",
  });

  const finding = {
    _id: new mongoose.Types.ObjectId().toString(),
    scheduledAudit: audit._id,
    status: "DRAFT",
    workflowStatus: "auditor_draft",
    submittedBy: owner._id,
    auditor: owner._id,
    async save() {},
  };

  AuditFinding.findById = () => query(finding);
  ScheduledAudit.findById = () => query(audit);

  await assert.rejects(
    updateAuditFindingDraft(
      finding._id,
      { description: "Attempted edit" },
      user
    ),
    { statusCode: 403 }
  );
});

test("Submitted findings cannot be edited through draft endpoints", async () => {
  const audit = makeAudit({
    auditors: ["Auditor One"],
  });
  const user = makeUser({
    name: "Auditor One",
  });

  const finding = {
    _id: new mongoose.Types.ObjectId().toString(),
    scheduledAudit: audit._id,
    status: "SUBMITTED",
    workflowStatus: "submitted_to_lead",
    submittedBy: user._id,
    auditor: user._id,
    async save() {},
  };

  AuditFinding.findById = () => query(finding);
  ScheduledAudit.findById = () => query(audit);

  await assert.rejects(
    updateAuditFindingDraft(
      finding._id,
      { description: "Nope" },
      user
    ),
    { statusCode: 409 }
  );

  await assert.rejects(
    submitAuditFindingDraft(
      finding._id,
      user
    ),
    { statusCode: 409 }
  );
});

test("Draft submission transitions correctly into Lead Auditor review", async () => {
  const audit = makeAudit({
    leadAuditor: "Assigned Lead",
    auditors: ["Assigned Lead", "Auditor One"],
  });
  const user = makeUser({
    name: "Auditor One",
  });

  const finding = {
    _id: new mongoose.Types.ObjectId().toString(),
    scheduledAudit: audit._id,
    status: "DRAFT",
    workflowStatus: "auditor_draft",
    submittedBy: user._id,
    auditor: user._id,
    async save() {},
  };

  AuditFinding.findById = () => query(finding);
  ScheduledAudit.findById = () => query(audit);

  const result = await submitAuditFindingDraft(
    finding._id,
    user
  );

  assert.equal(result.status, "SUBMITTED");
  assert.equal(result.workflowStatus, "submitted_to_lead");
});

test("October 14 versus October 15 boundary in Asia/Kolkata", async () => {
  const RealDate = global.Date;

  const makeMockDate = (iso) => {
    class MockDate extends RealDate {
      constructor(...args) {
        if (args.length === 0) {
          return new RealDate(iso);
        }

        return new RealDate(...args);
      }

      static now() {
        return new RealDate(iso).getTime();
      }
    }

    return MockDate;
  };

  const audit = makeAudit({
    startDate: new Date("2026-10-15T00:00:00Z"),
    auditors: ["Auditor One"],
  });
  const user = makeUser({
    name: "Auditor One",
  });

  AuditFinding.create = async ([payload], options) => {
    assert.ok(options.session);
    return [{ ...payload, _id: new mongoose.Types.ObjectId().toString() }];
  };
  ScheduledAudit.findById = () => query(audit);

  try {
    global.Date = makeMockDate("2026-10-14T18:00:00Z");

    await assert.rejects(
      createAuditFindingDraft(
        audit._id,
        {
          description: "Not allowed yet",
          classification: "OFI",
        },
        user
      ),
      { statusCode: 403 }
    );

    global.Date = makeMockDate("2026-10-15T01:00:00Z");

    const allowed = await createAuditFindingDraft(
      audit._id,
      {
        description: "Allowed on start day",
        classification: "OFI",
      },
      user
    );

    assert.equal(allowed.status, "DRAFT");
    assert.equal(allowed.workflowStatus, "auditor_draft");
  } finally {
    global.Date = RealDate;
  }
});

test("IQR generation requires a completed IQA and individually completed finding", async () => {
  const audit = makeAudit({
    _id: new mongoose.Types.ObjectId().toString(),
    leadAuditor: "Assigned Lead",
    auditCoordinator: "Coordinator A",
    auditors: ["Assigned Lead", "Auditor One"],
    startDate: new Date("2026-10-15T00:00:00Z"),
  });
  const user = {
    name: "Coordinator A",
    role: "audit_coordinator",
  };

  const finding = {
    _id: new mongoose.Types.ObjectId().toString(),
    scheduledAudit: audit._id,
    auditArea: "Production",
    findings: "Evidence of issue",
    severity: "open_for_improvement",
    visitDate: new Date("2026-10-15T00:00:00Z"),
    visitTime: "09:30",
    workflowStatus: "submitted_to_coordinator",
    proofFiles: [],
    hasChecklist: false,
    workflowHistory: [],
    async save() {},
  };

  AuditFinding.findById = () => query(finding);
  ScheduledAudit.findById = () => query(audit);
  Report.find = () => ({
    lean: async () => [],
  });
  Report.findOne = async () => null;
  Report.exists = async () => null;
  Report.create = async (reportData) => ({
    _id: new mongoose.Types.ObjectId().toString(),
    iqrNumber: "IQR-2026-0001",
    ...reportData,
  });

  // An ongoing IQA cannot generate an official IQR.
  audit.status = "ongoing";

  await assert.rejects(
    convertFindingToReport(finding._id, user),
    { statusCode: 409 }
  );

  assert.equal(finding.workflowStatus, "submitted_to_coordinator");

  // Completing the IQA alone is insufficient.
  // The Coordinator must also verify and complete this finding.
  audit.status = "completed";

  await assert.rejects(
    convertFindingToReport(finding._id, user),
    { statusCode: 409 }
  );

  assert.equal(finding.workflowStatus, "submitted_to_coordinator");
});

test("Compatibility aliases remain in the route tree without bypassing the auditor gate", () => {
  const aliasPaths = auditFindingRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.ok(aliasPaths.includes("/scheduled-audits/:scheduledAuditId/findings"));
  assert.ok(aliasPaths.includes("/scheduled/:scheduledAuditId"));
  assert.ok(aliasPaths.includes("/:id"));
  assert.ok(aliasPaths.includes("/submit-to-lead"));
  assert.ok(aliasPaths.includes("/"));
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
