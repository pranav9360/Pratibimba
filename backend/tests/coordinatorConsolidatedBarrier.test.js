import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import ScheduledAudit from "../models/ScheduledAudit.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import Report from "../models/Report.js";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import {
  reviewCoordinatorConsolidatedClassification,
  convertConsolidatedFindingToReport,
} from "../services/auditFindingService.js";

const originals = {
  startSession: mongoose.startSession,
  auditFindById: ScheduledAudit.findById,
  auditFindOneAndUpdate: ScheduledAudit.findOneAndUpdate,
  findingFindById: ConsolidatedFinding.findById,
  reportExists: Report.exists,
  reportFindOne: Report.findOne,
  reportCreate: Report.create,
  zeroFindingExists: ZeroFindingDeclaration.exists,
};

const restore = () => {
  mongoose.startSession = originals.startSession;
  ScheduledAudit.findById = originals.auditFindById;
  ScheduledAudit.findOneAndUpdate = originals.auditFindOneAndUpdate;
  ConsolidatedFinding.findById = originals.findingFindById;
  Report.exists = originals.reportExists;
  Report.findOne = originals.reportFindOne;
  Report.create = originals.reportCreate;
  ZeroFindingDeclaration.exists = originals.zeroFindingExists;
};

test.afterEach(restore);

const makeFixture = () => {
  const audit = {
    _id: new mongoose.Types.ObjectId(),
    workflowMode: "consolidated",
    status: "ongoing",
    auditCoordinator: "Assigned Coordinator",
  };

  const finding = {
    _id: new mongoose.Types.ObjectId(),
    scheduledAudit: audit._id,
    status: "SUBMITTED",
    workflowStatus: "submitted_to_coordinator",
    classification: "NC",
    workflowHistory: [],
    save: async function (options) {
      assert.ok(options.session);
      return this;
    },
  };

  const user = {
    _id: new mongoose.Types.ObjectId(),
    name: "Assigned Coordinator",
    role: "audit_coordinator",
  };

  const session = {
    withTransaction: async (callback) => callback(),
    endSession: async () => {},
  };

  mongoose.startSession = async () => session;

  // No All Clear declaration exists in these finding-based fixtures.
  ZeroFindingDeclaration.exists = () => ({
    session: async () => null,
  });

  ConsolidatedFinding.findById = () => ({
    session: async () => finding,
  });

  ScheduledAudit.findById = () => ({
    session: async () => audit,
  });

  return { audit, finding, user, session };
};

const installBarrier = (audit, session, callback) => {
  ScheduledAudit.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(String(filter._id), String(audit._id));
    assert.equal(filter.workflowMode, "consolidated");
    assert.deepEqual(filter.status, { $ne: "completed" });
    assert.deepEqual(update, {
      $inc: { workflowRevision: 1 },
    });
    assert.equal(options.session, session);

    callback?.();

    return audit.status === "completed" ? null : audit;
  };
};

test("Coordinator classification acquires audit transaction barrier", async () => {
  const { audit, finding, user, session } = makeFixture();

  let barrierCalls = 0;
  installBarrier(audit, session, () => {
    barrierCalls += 1;
  });

  Report.exists = () => ({
    session: async () => null,
  });

  const result = await reviewCoordinatorConsolidatedClassification(
    finding._id,
    "OFI",
    user
  );

  assert.equal(barrierCalls, 1);
  assert.equal(result.coordinatorClassification, "OFI");
  assert.equal(result.classification, "NC");
});

test("Coordinator classification rejects completed audit", async () => {
  const { audit, finding, user, session } = makeFixture();

  audit.status = "completed";
  installBarrier(audit, session);

  let saved = false;
  finding.save = async () => {
    saved = true;
  };

  await assert.rejects(
    reviewCoordinatorConsolidatedClassification(
      finding._id,
      "OFI",
      user
    ),
    { statusCode: 409 }
  );

  assert.equal(saved, false);
});

test("Existing official IQR is returned without acquiring write barrier", async () => {
  const { audit, finding, user, session } = makeFixture();

  audit.status = "completed";

  let barrierCalls = 0;
  installBarrier(audit, session, () => {
    barrierCalls += 1;
  });

  const existing = {
    _id: new mongoose.Types.ObjectId(),
    iqrNumber: "IQR-2026-0001",
  };

  Report.findOne = () => ({
    session: async () => existing,
  });

  Report.create = async () => {
    throw new Error("Duplicate IQR creation attempted");
  };

  const result = await convertConsolidatedFindingToReport(
    finding._id,
    user
  );

  assert.equal(result, existing);
  assert.equal(barrierCalls, 0);
});

test("New IQR generation rejects completed audit", async () => {
  const { audit, finding, user, session } = makeFixture();

  audit.status = "completed";
  installBarrier(audit, session);

  Report.findOne = () => ({
    session: async () => null,
  });

  let created = false;

  Report.create = async () => {
    created = true;
    throw new Error("Creation must not occur");
  };

  await assert.rejects(
    convertConsolidatedFindingToReport(
      finding._id,
      user
    ),
    { statusCode: 409 }
  );

  assert.equal(created, false);
});

test("New IQR generation acquires barrier before payload validation", async () => {
  const { audit, finding, user, session } = makeFixture();

  let barrierCalls = 0;
  installBarrier(audit, session, () => {
    barrierCalls += 1;
  });

  Report.findOne = () => ({
    session: async () => null,
  });

  // The fixture deliberately lacks an IQA number. This verifies
  // that the barrier runs before later report validation.
  await assert.rejects(
    convertConsolidatedFindingToReport(
      finding._id,
      user
    ),
    { statusCode: 409 }
  );

  assert.equal(barrierCalls, 1);
});


test("IQR generation requires an explicit Coordinator classification", async () => {
  const { audit, finding, user, session } = makeFixture();

  // Ensure execution reaches the Coordinator classification check.
  audit.iqaNumber = "IQA-2026-0001";
  finding.coordinatorClassification = null;

  let barrierCalls = 0;
  installBarrier(audit, session, () => {
    barrierCalls += 1;
  });

  Report.findOne = () => ({
    session: async () => null,
  });

  let created = false;
  Report.create = async () => {
    created = true;
    throw new Error("IQR must not be created without Coordinator review.");
  };

  await assert.rejects(
    convertConsolidatedFindingToReport(finding._id, user),
    {
      statusCode: 409,
      message: "The Coordinator must save an NC or OFI classification before generating an IQR.",
    }
  );

  assert.equal(barrierCalls, 1);
  assert.equal(created, false);
  assert.equal(finding.classification, "NC");
});
