import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import User from "../models/User.js";
import AuditFinding from "../models/AuditFinding.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import authorize from "../middleware/authorize.js";
import auditFindingRoutes from "../routes/auditFindingRoutes.js";
import { approveFindingAndSubmitToCoordinator } from "../services/auditFindingService.js";

const runAuthorization = (allowedRoles, user) => {
  const middleware = authorize(...allowedRoles);

  let result = null;

  middleware(
    { user },
    {},
    (error) => {
      result = error || "allowed";
    }
  );

  return result;
};

test("User role enum excludes obsolete lead_auditor role", () => {
  assert.equal(
    User.schema.path("role").enumValues.includes("lead_auditor"),
    false
  );
});

test("Audit finding routes preserve the auditor gate", () => {
  const paths = auditFindingRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.ok(paths.includes("/scheduled-audits/:scheduledAuditId/findings"));
  assert.ok(paths.includes("/scheduled/:scheduledAuditId"));
  assert.ok(paths.includes("/submit-to-lead"));
});

test("Legacy lead_auditor role is rejected by authorization middleware", () => {
  const result = runAuthorization(["auditor"], { role: "lead_auditor" });

  assert.equal(result.statusCode, 403);
});

test("Lead approval is scoped to the current Scheduled Audit assignment", async () => {
  const findingId = new mongoose.Types.ObjectId().toString();
  const auditId = new mongoose.Types.ObjectId().toString();
  const leadUser = {
    _id: new mongoose.Types.ObjectId().toString(),
    name: "Assigned Lead",
    role: "auditor",
  };

  const originalFindById = AuditFinding.findById;
  const originalAuditLookup = ScheduledAudit.findById;

  try {
    AuditFinding.findById = async () => ({
      _id: findingId,
      scheduledAudit: auditId,
      workflowStatus: "submitted_to_lead",
      workflowHistory: [],
      submittedBy: new mongoose.Types.ObjectId().toString(),
      async save() {},
    });

    ScheduledAudit.findById = async () => ({
      _id: auditId,
      leadAuditor: "Someone Else",
      auditCoordinator: "Coordinator A",
      auditors: ["Assigned Lead", "Other Auditor"],
    });

    await assert.rejects(
      approveFindingAndSubmitToCoordinator(findingId, {}, leadUser),
      { statusCode: 403 }
    );
  } finally {
    AuditFinding.findById = originalFindById;
    ScheduledAudit.findById = originalAuditLookup;
  }
});
