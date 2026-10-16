import test from "node:test";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import ScheduledAudit from "../models/ScheduledAudit.js";
import AuditPlan from "../models/AuditPlan.js";
import AuditFinding from "../models/AuditFinding.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import Report from "../models/Report.js";
import ConsolidatedFindingSourceClaim from "../models/ConsolidatedFindingSourceClaim.js";
import { completeScheduledAudit } from "../services/scheduledAuditService.js";

const originals = {
  startSession: mongoose.startSession,
  auditFindOne: ScheduledAudit.findOne,
  auditFindOneAndUpdate: ScheduledAudit.findOneAndUpdate,
  planFindById: AuditPlan.findById,
  sourceFind: AuditFinding.find,
  consolidatedFind: ConsolidatedFinding.find,
  reportFind: Report.find,
  claimFind: ConsolidatedFindingSourceClaim.find,
};

test.afterEach(() => {
  mongoose.startSession = originals.startSession;
  ScheduledAudit.findOne = originals.auditFindOne;
  ScheduledAudit.findOneAndUpdate = originals.auditFindOneAndUpdate;
  AuditPlan.findById = originals.planFindById;
  AuditFinding.find = originals.sourceFind;
  ConsolidatedFinding.find = originals.consolidatedFind;
  Report.find = originals.reportFind;
  ConsolidatedFindingSourceClaim.find = originals.claimFind;
});

function fixture({
  sources = [],
  findings = [],
  reports = [],
  claims = null,
  auditStatus = "ongoing",
  planSaveFails = false,
} = {}) {
  const events = [];

  const auditId = new mongoose.Types.ObjectId();
  const planId = new mongoose.Types.ObjectId();

  const state = {
    auditStatus,
    planStatus: "scheduled",
    revision: 0,
  };

  let transactionActive = false;
  let ended = false;

  const session = {
    async withTransaction(callback) {
      const snapshot = { ...state };
      transactionActive = true;

      try {
        const result = await callback();
        events.push("commit");
        return result;
      } catch (error) {
        Object.assign(state, snapshot);
        events.push("rollback");
        throw error;
      } finally {
        transactionActive = false;
      }
    },
    async endSession() {
      ended = true;
      events.push("endSession");
    },
  };

  const makeAudit = () => ({
    _id: auditId,
    auditPlan: planId,
    workflowMode: "consolidated",
    status: state.auditStatus,
    endDate: new Date("2020-01-01"),
    auditCoordinator: "Coordinator One",
    async save(options) {
      assert.equal(options?.session, session);
      assert.equal(transactionActive, true);
      state.auditStatus = this.status;
      events.push("auditSave");
      return this;
    },
  });

  ScheduledAudit.findOne = async (filter) => {
    assert.equal(String(filter._id), String(auditId));

    if (
      filter.auditCoordinator &&
      filter.auditCoordinator !== "Coordinator One"
    ) {
      return null;
    }

    return makeAudit();
  };

  ScheduledAudit.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(String(filter._id), String(auditId));
    assert.equal(filter.workflowMode, "consolidated");
    assert.deepEqual(filter.status, { $ne: "completed" });
    assert.deepEqual(update, {
      $inc: { workflowRevision: 1 },
    });
    assert.equal(options.session, session);
    assert.equal(transactionActive, true);

    events.push("barrier");

    if (state.auditStatus === "completed") {
      return null;
    }

    state.revision += 1;
    return makeAudit();
  };

  const query = (data, label) => ({
    select() {
      return {
        session(selectedSession) {
          assert.equal(selectedSession, session);
          assert.equal(transactionActive, true);
          events.push(label);
          return Promise.resolve(data);
        },
      };
    },
  });

  AuditFinding.find = () => query(sources, "sourcesRead");

  ConsolidatedFinding.find = () =>
    query(findings, "consolidatedRead");

  Report.find = () => query(reports, "reportsRead");

  const effectiveClaims = claims ?? findings.flatMap((finding) =>
    (finding.sourceFindings || []).map((sourceFinding) => ({
      scheduledAudit: auditId,
      consolidatedFinding: finding._id,
      sourceFinding,
      status: "active",
    }))
  );

  ConsolidatedFindingSourceClaim.find = () =>
    query(effectiveClaims, "claimsRead");

  AuditPlan.findById = (id) => {
    assert.equal(String(id), String(planId));

    return {
      async session(selectedSession) {
        assert.equal(selectedSession, session);
        assert.equal(transactionActive, true);

        events.push("planRead");

        return {
          status: state.planStatus,
          async save(options) {
            assert.equal(options?.session, session);
            assert.equal(transactionActive, true);

            events.push("planSave");

            if (planSaveFails) {
              throw new Error("Simulated AuditPlan save failure");
            }

            state.planStatus = this.status;
            return this;
          },
        };
      },
    };
  };

  mongoose.startSession = async () => session;

  const user = {
    role: "audit_coordinator",
    name: "Coordinator One",
  };

  return {
    auditId,
    user,
    state,
    events,
    get ended() {
      return ended;
    },
  };
}

test("Consolidated audit and parent plan complete atomically", async () => {
  const f = fixture();

  const result = await completeScheduledAudit(f.auditId, f.user);

  assert.equal(result.status, "completed");
  assert.equal(f.state.auditStatus, "completed");
  assert.equal(f.state.planStatus, "completed");
  assert.equal(f.state.revision, 1);
  assert.equal(f.ended, true);

  assert.ok(f.events.indexOf("barrier") < f.events.indexOf("sourcesRead"));
  assert.ok(f.events.indexOf("sourcesRead") < f.events.indexOf("consolidatedRead"));
  assert.ok(f.events.indexOf("consolidatedRead") < f.events.indexOf("auditSave"));
  assert.ok(f.events.indexOf("auditSave") < f.events.indexOf("planSave"));
  assert.ok(f.events.includes("commit"));
});

test("Zero submitted findings allow atomic completion", async () => {
  const f = fixture({
    sources: [],
    findings: [],
    reports: [],
  });

  await completeScheduledAudit(f.auditId, f.user);

  assert.equal(f.state.auditStatus, "completed");
  assert.equal(f.state.planStatus, "completed");
});

test("Unconsolidated submitted finding blocks completion", async () => {
  const f = fixture({
    sources: [{ _id: "source-1" }],
    findings: [],
  });

  await assert.rejects(
    completeScheduledAudit(f.auditId, f.user),
    { statusCode: 409 }
  );

  assert.equal(f.state.auditStatus, "ongoing");
  assert.equal(f.state.planStatus, "scheduled");
  assert.ok(f.events.includes("rollback"));
  assert.equal(f.ended, true);
});

test("AuditPlan save failure rolls back audit completion", async () => {
  const f = fixture({ planSaveFails: true });

  await assert.rejects(
    completeScheduledAudit(f.auditId, f.user),
    /Simulated AuditPlan save failure/
  );

  assert.equal(f.state.auditStatus, "ongoing");
  assert.equal(f.state.planStatus, "scheduled");
  assert.equal(f.state.revision, 0);
  assert.ok(f.events.includes("rollback"));
  assert.equal(f.ended, true);
});

test("Unauthorized Auditor cannot start completion transaction", async () => {
  const f = fixture();

  await assert.rejects(
    completeScheduledAudit(f.auditId, {
      role: "auditor",
      name: "Auditor One",
    }),
    { statusCode: 403 }
  );

  assert.deepEqual(f.events, []);
  assert.equal(f.state.auditStatus, "ongoing");
});

test("Unassigned Coordinator cannot complete another audit", async () => {
  const f = fixture();

  await assert.rejects(
    completeScheduledAudit(f.auditId, {
      role: "audit_coordinator",
      name: "Different Coordinator",
    }),
    { statusCode: 404 }
  );

  assert.deepEqual(f.events, []);
});

test("Already-completed audit returns without another transaction", async () => {
  const f = fixture({ auditStatus: "completed" });

  const result = await completeScheduledAudit(f.auditId, f.user);

  assert.equal(result.status, "completed");
  assert.deepEqual(f.events, []);
  assert.equal(f.state.revision, 0);
});

test("Completed audit barrier rejects new completion attempt", async () => {
  const f = fixture();

  // Simulate another operation completing the audit between
  // the authorization read and the transactional barrier.
  const originalFindOneAndUpdate = ScheduledAudit.findOneAndUpdate;

  ScheduledAudit.findOneAndUpdate = async (...args) => {
    f.state.auditStatus = "completed";
    return originalFindOneAndUpdate(...args);
  };

  await assert.rejects(
    completeScheduledAudit(f.auditId, f.user),
    { statusCode: 409 }
  );

  assert.equal(f.state.planStatus, "scheduled");
  assert.equal(f.ended, true);
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
