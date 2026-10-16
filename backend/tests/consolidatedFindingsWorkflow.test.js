import test from "node:test";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import LeadBatchSubmission from "../models/LeadBatchSubmission.js";

import AuditFinding from "../models/AuditFinding.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import ConsolidatedFindingSourceClaim from "../models/ConsolidatedFindingSourceClaim.js";
import ScheduledAudit from "../models/ScheduledAudit.js";

import {
  listEligibleSubmittedFindingsForAudit,
  createConsolidatedFinding,
  updateConsolidatedFindingDraft,
  submitConsolidatedFinding,
  submitAllConsolidatedFindingsForAudit,
} from "../services/auditFindingService.js";

const queryResult = value => ({ then: (ok, fail) => Promise.resolve(value).then(ok, fail),
  session() { return this; }, select() { return this; } });
const originalHandoverFind = LeadBatchSubmission.findOne;
const originalHandoverCreate = LeadBatchSubmission.create;
const originalHandoverUpdate = LeadBatchSubmission.updateOne;
let currentHandover;
const batchRequest = () => {
  const drafts = currentConsolidateds.filter(f => f.status === "DRAFT" && f.workflowStatus === "consolidated_draft");
  const rows = drafts.map(f => [String(f._id), f.workflowStatus, f.status, f.classification, f.severity,
    f.leadEditedCopy?.revision || 0, f.leadReviewedAt || null, f.updatedAt || null, f.title || "",
    f.sourceFindings.map(String).sort()]).sort((a, b) => a[0].localeCompare(b[0]));
  return { requestId: randomUUID(), findingIds: drafts.map(f => f._id).sort(),
    confirmation: createHash("sha256").update(JSON.stringify(rows)).digest("hex") };
};

const originalAuditFind = AuditFinding.find;
const originalAuditFindById = AuditFinding.findById;
const originalScheduledFindById = ScheduledAudit.findById;
const originalScheduledFindOneAndUpdate = ScheduledAudit.findOneAndUpdate;
const originalConsolidatedFind = ConsolidatedFinding.find;
const originalConsolidatedFindById = ConsolidatedFinding.findById;
const originalConsolidatedCreate = ConsolidatedFinding.create;
const originalSourceClaimFind = ConsolidatedFindingSourceClaim.find;
const originalSourceClaimFindOneAndUpdate =
  ConsolidatedFindingSourceClaim.findOneAndUpdate;
const originalSourceClaimDeleteMany =
  ConsolidatedFindingSourceClaim.deleteMany;
const originalSourceClaimCreateIndex =
  ConsolidatedFindingSourceClaim.collection.createIndex;
const originalSourceClaimIndexes =
  ConsolidatedFindingSourceClaim.collection.indexes;
const originalStartSession = mongoose.startSession;
const originalReadyState = mongoose.connection.readyState;
const originalConnectionDb = mongoose.connection.db;

const makeUser = (over = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  name: "Assigned Lead",
  role: "auditor",
  ...over,
});

const makeAudit = (over = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  auditPlan: new mongoose.Types.ObjectId().toString(),
  iqaNumber: "IQA-2026-001",
  prakalpa: "Prakalpa One",
  location: "Pune",
  sublocation: "Block A",
  auditCoordinator: "Assigned Coordinator",
  leadAuditor: "Assigned Lead",
  workflowMode: "consolidated",
  auditors: ["Assigned Lead", "Auditor One"],
  auditAreas: ["Production"],
  startDate: new Date("2026-10-15T00:00:00Z"),
  ...over,
});

const makeSubmittedFinding = (auditId, over = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  scheduledAudit: auditId,
  status: "SUBMITTED",
  workflowStatus: "submitted_to_lead",
  submittedBy: new mongoose.Types.ObjectId().toString(),
  submittedByName: "Auditor One",
  workflowHistory: [],
  save: async function () {
    return this;
  },
  ...over,
});

const makeConsolidatedFinding = (auditId, over = {}) => ({
  _id: new mongoose.Types.ObjectId().toString(),
  scheduledAudit: auditId,
  status: "DRAFT",
  workflowStatus: "consolidated_draft",
  sourceFindings: [],
  title: "Draft consolidated finding",
  classification: "NC",
  workflowHistory: [],
  save: async function () {
    if (failNextConsolidatedSave) {
      failNextConsolidatedSave = false;
      throw new Error("Simulated consolidated finding save failure");
    }
    return this;
  },
  ...over,
});

let currentAudit;
let currentFindings;
let currentConsolidateds;
let currentClaims;
let failNextConsolidatedSave;
let failNextClaim;
let failClaimAfterFirstWrite;
let failNextConsolidatedCreate;
let indexEnsureCount;
let sourceIndexAvailable;

const restoreMocks = () => {
  LeadBatchSubmission.findOne = originalHandoverFind;
  LeadBatchSubmission.create = originalHandoverCreate;
  LeadBatchSubmission.updateOne = originalHandoverUpdate;
  AuditFinding.find = originalAuditFind;
  AuditFinding.findById = originalAuditFindById;
  ScheduledAudit.findById = originalScheduledFindById;
  ScheduledAudit.findOneAndUpdate = originalScheduledFindOneAndUpdate;
  ConsolidatedFinding.find = originalConsolidatedFind;
  ConsolidatedFinding.findById = originalConsolidatedFindById;
  ConsolidatedFinding.create = originalConsolidatedCreate;
  ConsolidatedFindingSourceClaim.find = originalSourceClaimFind;
  ConsolidatedFindingSourceClaim.findOneAndUpdate =
    originalSourceClaimFindOneAndUpdate;
  ConsolidatedFindingSourceClaim.deleteMany =
    originalSourceClaimDeleteMany;
  ConsolidatedFindingSourceClaim.collection.createIndex =
    originalSourceClaimCreateIndex;
  ConsolidatedFindingSourceClaim.collection.indexes =
    originalSourceClaimIndexes;
  mongoose.startSession = originalStartSession;
  mongoose.connection.readyState = originalReadyState;
  mongoose.connection.db = originalConnectionDb;
};

const resetState = () => {
  currentAudit = makeAudit();
  currentFindings = [
    makeSubmittedFinding(currentAudit._id, {
      _id: new mongoose.Types.ObjectId().toString(),
      submittedBy: new mongoose.Types.ObjectId().toString(),
      submittedByName: "Auditor One",
      workflowStatus: "submitted_to_lead",
    }),
    makeSubmittedFinding(currentAudit._id, {
      _id: new mongoose.Types.ObjectId().toString(),
      submittedBy: new mongoose.Types.ObjectId().toString(),
      submittedByName: "Auditor Two",
      workflowStatus: "returned_to_auditor",
    }),
  ];
  currentConsolidateds = [];
  currentHandover = null;
  LeadBatchSubmission.findOne = () => queryResult(currentHandover);
  LeadBatchSubmission.create = async records => { currentHandover = { _id: new mongoose.Types.ObjectId(), ...records[0] }; return [currentHandover]; };
  LeadBatchSubmission.updateOne = async (filter, update) => {
    (currentHandover.supplementalHandovers ||= []).push(update.$push.supplementalHandovers);
    return { modifiedCount: 1 };
  };
  currentClaims = [];
  failNextConsolidatedSave = false;
  failNextClaim = false;
  failClaimAfterFirstWrite = false;
  failNextConsolidatedCreate = false;
  indexEnsureCount = 0;
  sourceIndexAvailable = true;

  mongoose.connection.readyState = 1;
  mongoose.connection.db = {};
  ConsolidatedFindingSourceClaim.collection.createIndex =
    async () => {
      indexEnsureCount += 1;
      return "sourceFinding_1";
    };
  ConsolidatedFindingSourceClaim.collection.indexes =
    async () => {
      const indexes = [
        { name: "_id_", key: { _id: 1 }, unique: true },
      ];
      if (sourceIndexAvailable) {
        indexes.push({
          name: "sourceFinding_1",
          key: { sourceFinding: 1 },
          unique: true,
        });
      }
      return indexes;
    };

  mongoose.startSession = async () => ({
    withTransaction: async (operation) => {
      const consolidatedSnapshot =
        currentConsolidateds.map((record) => ({
          ...record,
          sourceFindings: [...record.sourceFindings],
          workflowHistory: [...record.workflowHistory],
        }));
      const claimsSnapshot =
        currentClaims.map((claim) => ({ ...claim }));

      try {
        return await operation({});
      } catch (error) {
        currentConsolidateds.splice(
          0,
          currentConsolidateds.length,
          ...consolidatedSnapshot
        );
        currentClaims.splice(
          0,
          currentClaims.length,
          ...claimsSnapshot
        );
        throw error;
      }
    },
    endSession: async () => {},
  });

  ScheduledAudit.findById = async () => currentAudit;

  ScheduledAudit.findOneAndUpdate = async (filter, update, options) => {
    assert.equal(
      String(filter._id),
      String(currentAudit._id)
    );

    assert.equal(filter.workflowMode, "consolidated");
    assert.deepEqual(filter.status, { $ne: "completed" });
    assert.deepEqual(update, {
      $inc: { workflowRevision: 1 },
    });

    assert.equal(options.new, true);
    assert.ok(options.session);

    if (
      currentAudit.workflowMode !== "consolidated" ||
      currentAudit.status === "completed"
    ) {
      return null;
    }

    currentAudit.workflowRevision =
      (currentAudit.workflowRevision || 0) + 1;

    return currentAudit;
  };
  AuditFinding.find = (query) => {
    let records = currentFindings;

    if (query && query.scheduledAudit) {
      records = records.filter(
        (finding) => String(finding.scheduledAudit) === String(query.scheduledAudit)
      );
    }

    if (query && query._id && query._id.$in) {
      records = records.filter((finding) =>
        query._id.$in.some(
          (candidate) => String(candidate) === String(finding._id)
        )
      );
    }

    if (query && query.status) {
      records = records.filter((finding) => finding.status === query.status);
    }

    if (query && query.workflowStatus && query.workflowStatus.$in) {
      records = records.filter((finding) =>
        query.workflowStatus.$in.includes(finding.workflowStatus)
      );
    }

    if (query && query._id && query._id.$nin) {
      records = records.filter((finding) =>
        !query._id.$nin.some(
          (candidate) => String(candidate) === String(finding._id)
        )
      );
    }

    return queryResult(records);
  };
  AuditFinding.findById = async (id) =>
    currentFindings.find((finding) => String(finding._id) === String(id)) || null;

  ConsolidatedFinding.find = (query) => {
    if (query && query.sourceFindings && query.sourceFindings.$in) {
      return queryResult(currentConsolidateds.filter((finding) => {
        const excludedId = query._id && query._id.$ne;
        return (
          (!excludedId ||
            String(finding._id) !== String(excludedId)) &&
          finding.sourceFindings.some((sourceId) =>
            query.sourceFindings.$in.some(
              (candidate) => String(candidate) === String(sourceId)
            )
          )
        );
      }));
    }

    if (query && query.scheduledAudit) {
      return queryResult(currentConsolidateds.filter(
        (finding) => String(finding.scheduledAudit) === String(query.scheduledAudit) &&
          (!query._id?.$in || query._id.$in.some(id => String(id) === String(finding._id)))
      ));
    }

    return queryResult(currentConsolidateds);
  };

  ConsolidatedFinding.findById = (id) => {
    const stored = currentConsolidateds.find(
      (finding) => String(finding._id) === String(id)
    );
    if (!stored) return queryResult(null);

    return queryResult({
      ...stored,
      sourceFindings: [...stored.sourceFindings],
      workflowHistory: [...stored.workflowHistory],
      save: async function () {
        if (failNextConsolidatedSave) {
          failNextConsolidatedSave = false;
          throw new Error("Simulated consolidated finding save failure");
        }

        const index = currentConsolidateds.findIndex(
          (record) => String(record._id) === String(this._id)
        );
        currentConsolidateds[index] = this;
        return this;
      },
    });
  };

  ConsolidatedFinding.create = async (payload) => {
    if (failNextConsolidatedCreate) {
      failNextConsolidatedCreate = false;
      throw new Error("Simulated consolidated finding write failure");
    }

    const values = Array.isArray(payload) ? payload : [payload];
    const records = values.map((value) => {
      const record = makeConsolidatedFinding(value.scheduledAudit, value);
      currentConsolidateds.push(record);
      return record;
    });
    return Array.isArray(payload) ? records : records[0];
  };

  ConsolidatedFindingSourceClaim.find = async (query = {}) =>
    currentClaims.filter(
      (claim) => !query.status || claim.status === query.status
    );

  ConsolidatedFindingSourceClaim.findOneAndUpdate =
    async (query, update) => {
      if (failClaimAfterFirstWrite && currentClaims.length > 0) {
        failClaimAfterFirstWrite = false;
        const error = new Error("Simulated later source claim conflict");
        error.code = 11000;
        throw error;
      }

      if (failNextClaim) {
        failNextClaim = false;
        const error = new Error("Simulated duplicate source claim");
        error.code = 11000;
        throw error;
      }

      const sourceId = String(query.sourceFinding);
      const existing = currentClaims.find(
        (claim) => String(claim.sourceFinding) === sourceId
      );

      if (
        existing &&
        String(existing.consolidatedFinding) !==
          String(update.consolidatedFinding)
      ) {
        const error = new Error("Duplicate source claim");
        error.code = 11000;
        throw error;
      }

      if (existing) {
        Object.assign(existing, update);
        return existing;
      }

      const claim = { ...update };
      currentClaims.push(claim);
      return claim;
    };

  ConsolidatedFindingSourceClaim.deleteMany =
    async (query) => {
      const sourceIds = new Set(
        query.sourceFinding.$in.map(String)
      );
      currentClaims = currentClaims.filter(
        (claim) =>
          !(
            String(claim.consolidatedFinding) ===
              String(query.consolidatedFinding) &&
            sourceIds.has(String(claim.sourceFinding))
          )
      );
      return { deletedCount: 1 };
    };
};

test.after(() => {
  restoreMocks();
});

test.beforeEach(() => {
  restoreMocks();
  resetState();
});

test("Assigned Lead Auditor can list submitted findings for their audit", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });

  const result = await listEligibleSubmittedFindingsForAudit(
    currentAudit._id,
    leadUser
  );

  assert.equal(result.length, 2);
});

test("Unassigned user cannot access another audit", async () => {
  const leadUser = makeUser({ name: "Another Lead" });

  await assert.rejects(
    listEligibleSubmittedFindingsForAudit(currentAudit._id, leadUser),
    { statusCode: 403 }
  );
});

test("Legacy audits cannot use consolidated finding operations", async () => {
  currentAudit.workflowMode = "legacy";

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [currentFindings[0]._id],
        title: "Consolidation not enabled",
        classification: "NC",
      },
      makeUser()
    ),
    { statusCode: 409 }
  );

  assert.equal(currentConsolidateds.length, 0);
  assert.equal(currentClaims.length, 0);
});

test("Lead Auditor can create a consolidated finding from one original", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;

  const result = await createConsolidatedFinding(
    currentAudit._id,
    {
      sourceFindings: [sourceId],
      title: "Fire extinguishers overdue",
      description: "Fire extinguishers were not maintained.",
      classification: "NC",
    },
    leadUser
  );

  assert.equal(result.status, "DRAFT");
  assert.equal(result.workflowStatus, "consolidated_draft");
  assert.equal(result.sourceFindings.length, 1);
  assert.equal(String(result.sourceFindings[0]), String(sourceId));
  assert.equal(currentClaims.length, 1);
  assert.equal(String(currentClaims[0].sourceFinding), String(sourceId));
  assert.ok(indexEnsureCount > 0);
});

test("Creation rolls back the consolidated record when claim creation fails", async () => {
  const sourceId = currentFindings[0]._id;
  failNextClaim = true;

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [sourceId],
        title: "Claim conflict",
        classification: "NC",
      },
      makeUser()
    ),
    { statusCode: 409 }
  );

  assert.equal(currentConsolidateds.length, 0);
  assert.equal(currentClaims.length, 0);
});

test("Creation rolls back earlier claims when a later claim conflicts", async () => {
  failClaimAfterFirstWrite = true;

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: currentFindings.map((finding) => finding._id),
        title: "Multiple source claim conflict",
        classification: "NC",
      },
      makeUser()
    ),
    { statusCode: 409 }
  );

  assert.equal(currentConsolidateds.length, 0);
  assert.equal(currentClaims.length, 0);
});

test("Disconnected MongoDB rejects consolidation writes", async () => {
  mongoose.connection.readyState = 0;

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [currentFindings[0]._id],
        title: "Unavailable database",
        classification: "NC",
      },
      makeUser()
    ),
    { statusCode: 503 }
  );

  assert.equal(currentConsolidateds.length, 0);
  assert.equal(currentClaims.length, 0);
});

test("Missing unique source index prevents consolidation writes", async () => {
  sourceIndexAvailable = false;

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [currentFindings[0]._id],
        title: "Index unavailable",
        classification: "NC",
      },
      makeUser()
    ),
    { statusCode: 503 }
  );

  assert.equal(currentConsolidateds.length, 0);
  assert.equal(currentClaims.length, 0);
});

test("Source claim conflicts are returned as a conflict and do not leave records", async () => {
  failNextClaim = true;

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [currentFindings[0]._id],
        title: "Concurrent claim",
        classification: "NC",
      },
      makeUser()
    ),
    { statusCode: 409 }
  );

  assert.equal(currentConsolidateds.length, 0);
  assert.equal(currentClaims.length, 0);
});

test("Source claim schema declares a unique sourceFinding index", () => {
  const sourceIndex = ConsolidatedFindingSourceClaim.schema
    .indexes()
    .find(
      ([keys, options]) =>
        keys.sourceFinding === 1 && options.unique === true
    );

  assert.ok(sourceIndex);
});

test("Lead Auditor can group two originals", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceIds = currentFindings.map((finding) => finding._id);

  const result = await createConsolidatedFinding(
    currentAudit._id,
    {
      sourceFindings: sourceIds,
      title: "Safety gaps",
      description: "Combined safety gaps across the audit.",
      classification: "OFI",
    },
    leadUser
  );

  assert.equal(result.sourceFindings.length, 2);
  assert.equal(result.classification, "OFI");
});

test("Original findings remain unchanged after consolidation", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;

  const originalSnapshot = {
    status: currentFindings[0].status,
    workflowStatus: currentFindings[0].workflowStatus,
    submittedByName: currentFindings[0].submittedByName,
  };

  await createConsolidatedFinding(
    currentAudit._id,
    {
      sourceFindings: [sourceId],
      title: "Safety gap",
      description: "Consolidated summary",
      classification: "NC",
    },
    leadUser
  );

  assert.equal(currentFindings[0].status, originalSnapshot.status);
  assert.equal(currentFindings[0].workflowStatus, originalSnapshot.workflowStatus);
  assert.equal(currentFindings[0].submittedByName, originalSnapshot.submittedByName);
});

test("Cross-audit source findings are rejected", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const otherAuditId = new mongoose.Types.ObjectId().toString();

  currentFindings[0].scheduledAudit = otherAuditId;

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [currentFindings[0]._id],
        title: "Wrong audit",
        classification: "NC",
        description: "Bad source",
      },
      leadUser
    ),
    { statusCode: 400 }
  );
});

test("Duplicate source IDs are rejected", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [sourceId, sourceId],
        title: "Duplicate group",
        classification: "NC",
        description: "Duplicate source",
      },
      leadUser
    ),
    { statusCode: 400 }
  );
});

test("Reusing a source in two active consolidated findings is rejected", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;

  currentConsolidateds.push(
    makeConsolidatedFinding(currentAudit._id, {
      sourceFindings: [sourceId],
      workflowStatus: "consolidated_draft",
    })
  );
  currentClaims.push({
    sourceFinding: sourceId,
    consolidatedFinding: currentConsolidateds[0]._id,
    scheduledAudit: currentAudit._id,
    status: "active",
  });

  await assert.rejects(
    createConsolidatedFinding(
      currentAudit._id,
      {
        sourceFindings: [sourceId],
        title: "Already used",
        classification: "NC",
        description: "Already claimed",
      },
      leadUser
    ),
    { statusCode: 409 }
  );
});

test("Draft consolidated findings can be edited", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;

  const draft = makeConsolidatedFinding(currentAudit._id, {
    _id: new mongoose.Types.ObjectId().toString(),
    sourceFindings: [sourceId],
    title: "Old title",
    classification: "NC",
    status: "DRAFT",
    workflowStatus: "consolidated_draft",
    workflowHistory: [],
  });

  currentConsolidateds.push(draft);
  currentClaims.push({
    sourceFinding: sourceId,
    consolidatedFinding: draft._id,
    scheduledAudit: currentAudit._id,
    status: "active",
  });

  const result = await updateConsolidatedFindingDraft(
    draft._id,
    {
      title: "Updated title",
      description: "Updated summary",
    },
    leadUser
  );

  assert.equal(result.title, "Updated title");
  assert.equal(result.description, "Updated summary");
});

test("Source-list update rolls back source claims when the finding save fails", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;
  const replacementId = currentFindings[1]._id;
  const draft = makeConsolidatedFinding(currentAudit._id, {
    sourceFindings: [sourceId],
    workflowHistory: [],
  });
  currentConsolidateds.push(draft);
  currentClaims.push({
    sourceFinding: sourceId,
    consolidatedFinding: draft._id,
    scheduledAudit: currentAudit._id,
    status: "active",
  });
  failNextConsolidatedSave = true;

  await assert.rejects(
    updateConsolidatedFindingDraft(
      draft._id,
      { sourceFindings: [replacementId] },
      leadUser
    ),
    /Simulated consolidated finding save failure/
  );

  assert.deepEqual(currentConsolidateds[0].sourceFindings, [sourceId]);
  assert.equal(currentClaims.length, 1);
  assert.equal(String(currentClaims[0].sourceFinding), String(sourceId));
});

test("Source-list updates release old claims and acquire new claims", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;
  const replacementId = currentFindings[1]._id;
  const draft = makeConsolidatedFinding(currentAudit._id, {
    sourceFindings: [sourceId],
    workflowHistory: [],
  });
  currentConsolidateds.push(draft);
  currentClaims.push({
    sourceFinding: sourceId,
    consolidatedFinding: draft._id,
    scheduledAudit: currentAudit._id,
    status: "active",
  });

  const result = await updateConsolidatedFindingDraft(
    draft._id,
    { sourceFindings: [replacementId] },
    leadUser
  );

  assert.deepEqual(
    result.sourceFindings.map(String),
    [String(replacementId)]
  );
  assert.equal(currentClaims.length, 1);
  assert.equal(String(currentClaims[0].sourceFinding), String(replacementId));
});

test("Submitted consolidated findings cannot be edited", async () => {
  const leadUser = makeUser({ name: "Assigned Lead" });

  const draft = makeConsolidatedFinding(currentAudit._id, {
    _id: new mongoose.Types.ObjectId().toString(),
    status: "SUBMITTED",
    workflowStatus: "submitted_to_coordinator",
    sourceFindings: [currentFindings[0]._id],
    title: "Finalized",
    classification: "NC",
    workflowHistory: [],
  });

  currentConsolidateds.push(draft);
  currentClaims.push({
    sourceFinding: currentFindings[0]._id,
    consolidatedFinding: draft._id,
    scheduledAudit: currentAudit._id,
    status: "active",
  });

  await assert.rejects(
    updateConsolidatedFindingDraft(
      draft._id,
      { title: "Nope" },
      leadUser
    ),
    { statusCode: 409 }
  );
});

test("Lead Auditor can submit without every auditor having submitted", async () => {
  currentFindings = [currentFindings[0]];
  const leadUser = makeUser({ name: "Assigned Lead" });
  const sourceId = currentFindings[0]._id;

  const draft = makeConsolidatedFinding(currentAudit._id, {
    _id: new mongoose.Types.ObjectId().toString(),
    sourceFindings: [sourceId],
    title: "Timing issue",
    classification: "NC",
    status: "DRAFT",
    workflowStatus: "consolidated_draft",
    workflowHistory: [],
  });

  currentConsolidateds.push(draft);
  currentClaims.push({
    sourceFinding: sourceId,
    consolidatedFinding: draft._id,
    scheduledAudit: currentAudit._id,
    status: "active",
  });

  const result = await submitConsolidatedFinding(draft._id, leadUser, {
    remarks: "Submitted for coordinator review",
  });

  assert.equal(result.workflowStatus, "submitted_to_coordinator");
  assert.equal(result.status, "SUBMITTED");
});

test("Ordinary Auditor cannot submit consolidated findings as Lead Auditor", async () => {
  const user = makeUser({ name: "Auditor One", role: "auditor" });
  const draft = makeConsolidatedFinding(currentAudit._id, {
    _id: new mongoose.Types.ObjectId().toString(),
    sourceFindings: [currentFindings[0]._id],
    title: "Unauthorized submit",
    classification: "NC",
    status: "DRAFT",
    workflowStatus: "consolidated_draft",
    workflowHistory: [],
  });

  currentConsolidateds.push(draft);

  await assert.rejects(
    submitConsolidatedFinding(draft._id, user),
    { statusCode: 403 }
  );
});


test("consolidated partial and supplemental batches preserve earlier sources and are idempotent", async () => {
  const lead = makeUser();
  // Only sources submitted so far must be represented; pending Auditors are irrelevant.
  currentFindings = [currentFindings[0]];
  const first = await createConsolidatedFinding(currentAudit._id, {
    title: "Initial NC", classification: "NC", sourceFindings: [currentFindings[0]._id],
  }, lead);
  const originalSource = JSON.stringify(currentFindings[0]);
  const initialRequest = batchRequest();
  await submitAllConsolidatedFindingsForAudit(currentAudit._id, lead, initialRequest);
  const firstSnapshot = JSON.stringify(first);
  currentFindings.push(makeSubmittedFinding(currentAudit._id));
  const second = await createConsolidatedFinding(currentAudit._id, {
    title: "Later OFI", classification: "OFI", sourceFindings: [currentFindings[1]._id],
  }, lead);
  const supplementalRequest = batchRequest();
  const sent = await submitAllConsolidatedFindingsForAudit(currentAudit._id, lead, supplementalRequest);
  assert.equal(sent.length, 1); assert.equal(sent[0]._id, second._id);
  assert.equal(JSON.stringify(first), firstSnapshot); assert.equal(JSON.stringify(currentFindings[0]), originalSource);
  await submitAllConsolidatedFindingsForAudit(currentAudit._id, lead, supplementalRequest);
  assert.equal(currentHandover.supplementalHandovers.length, 1);
  assert.equal(currentClaims.length, 2);
});

test("new ungrouped submitted sources block consolidated handover without silently incorporating them", async () => {
  currentFindings = [currentFindings[0]];
  await createConsolidatedFinding(currentAudit._id, { title: "NC", classification: "NC", sourceFindings: [currentFindings[0]._id] }, makeUser());
  const confirmed = batchRequest(); currentFindings.push(makeSubmittedFinding(currentAudit._id));
  await assert.rejects(submitAllConsolidatedFindingsForAudit(currentAudit._id, makeUser(), confirmed), { statusCode: 409 });
  assert.equal(currentConsolidateds[0].workflowStatus, "consolidated_draft"); assert.equal(currentHandover, null);
});

test("a new consolidated draft makes a previously confirmed batch stale", async () => {
  await createConsolidatedFinding(currentAudit._id, { title: "NC", classification: "NC", sourceFindings: [currentFindings[0]._id] }, makeUser());
  const confirmed = batchRequest();
  await createConsolidatedFinding(currentAudit._id, { title: "OFI", classification: "OFI", sourceFindings: [currentFindings[1]._id] }, makeUser());
  await assert.rejects(submitAllConsolidatedFindingsForAudit(currentAudit._id, makeUser(), confirmed), { statusCode: 409 });
  assert.equal(currentHandover, null);
});


test("the individual consolidated endpoint also rejects unreviewed submitted sources", async () => {
  const lead = makeUser();
  const draft = await createConsolidatedFinding(currentAudit._id, { title: "NC", classification: "NC", sourceFindings: [currentFindings[0]._id] }, lead);
  await assert.rejects(submitConsolidatedFinding(draft._id, lead), { statusCode: 409 });
  assert.equal(currentConsolidateds[0].workflowStatus, "consolidated_draft");
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
