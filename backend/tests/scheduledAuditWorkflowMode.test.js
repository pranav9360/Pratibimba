import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import ScheduledAudit from "../models/ScheduledAudit.js";
import { updateScheduledAudit } from "../services/scheduledAuditService.js";

const originalFindOne = ScheduledAudit.findOne;

test.after(() => {
  ScheduledAudit.findOne = originalFindOne;
});

test("New Scheduled Audits default to legacy workflow mode", () => {
  const audit = new ScheduledAudit();

  assert.equal(audit.workflowMode, "legacy");
  assert.deepEqual(
    ScheduledAudit.schema.path("workflowMode").enumValues,
    ["legacy", "consolidated"]
  );
});

test("Generic Scheduled Audit updates cannot change workflow mode", async () => {
  const audit = {
    _id: new mongoose.Types.ObjectId(),
    auditCoordinator: "Coordinator A",
    workflowMode: "legacy",
    status: "upcoming",
    async save() {
      assert.fail("Scheduled Audit must not be saved for a mode change");
    },
  };

  ScheduledAudit.findOne = async () => audit;

  await assert.rejects(
    updateScheduledAudit(
      String(audit._id),
      { workflowMode: "consolidated" },
      {
        name: "Coordinator A",
        role: "audit_coordinator",
      }
    ),
    {
      statusCode: 400,
      message: "Scheduled Audit workflow mode cannot be changed through this endpoint.",
    }
  );

  assert.equal(audit.workflowMode, "legacy");
});

test("Malformed workflow modes fail schema validation", () => {
  const audit = new ScheduledAudit({
    workflowMode: "unexpected",
  });
  const error = audit.validateSync();

  assert.ok(error?.errors?.workflowMode);
});
