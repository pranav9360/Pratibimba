import "dotenv/config";
import mongoose from "mongoose";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import User from "../models/User.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Role from "../models/Role.js";

const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
const backupRoot = path.resolve("../.migration-backups");

const expectedDatabase = "pratibimba";
const expectedPlanHash =
  "d7b5133927a2da81906c76b5d729ddd36d2dc38e2416106d801becd6151dffc7";

const expectedAuditId = "6a97f36701a7238803f063f4";
const expectedIqa = "IQA-2026-0029";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let connected = false;
let auditChanged = false;
const changedUsers = [];

let plan;
let originalAudit;

try {
  if (!uri) throw new Error("MongoDB URI missing.");

  const planFiles = fs
    .readdirSync(backupRoot, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.startsWith("lead-auditor-"))
    .map(d => path.join(backupRoot, d.name, "migration-plan.json"))
    .filter(p => fs.existsSync(p))
    .sort();

  if (planFiles.length === 0) {
    throw new Error("Migration plan not found.");
  }

  const planPath = planFiles.at(-1);
  const planBytes = fs.readFileSync(planPath);

  const hash = crypto
    .createHash("sha256")
    .update(planBytes)
    .digest("hex");

  if (hash !== expectedPlanHash) {
    throw new Error("Migration plan checksum mismatch.");
  }

  plan = JSON.parse(planBytes);

  if (
    plan.status !== "PREPARED_NOT_APPLIED" ||
    plan.database !== expectedDatabase ||
    plan.users.length !== 5 ||
    plan.expectedAudit.id !== expectedAuditId ||
    plan.expectedAudit.iqaNumber !== expectedIqa ||
    plan.expectedAudit.leadAuditor !== "chirag" ||
    !plan.expectedAudit.currentAuditors.includes("Lokesh B.S") ||
    !plan.expectedAudit.proposedAuditors.includes("chirag")
  ) {
    throw new Error("Migration plan validation failed.");
  }

  if (
    new Set(plan.users.map(u => u.id)).size !== 5 ||
    plan.users.some(
      u => u.fromRole !== "lead_auditor" || u.toRole !== "auditor"
    )
  ) {
    throw new Error("Unexpected migration user definitions.");
  }

  const backupDir = path.dirname(planPath);

  for (const [filename, count] of Object.entries({
    "users.json": 25,
    "scheduledAudits.json": 12,
    "roles.json": 5
  })) {
    const file = path.join(backupDir, filename);
    const records = JSON.parse(fs.readFileSync(file, "utf8"));

    if (!Array.isArray(records) || records.length !== count) {
      throw new Error(`Backup verification failed: ${filename}`);
    }
  }

  await mongoose.connect(uri);
  connected = true;

  if (mongoose.connection.name !== expectedDatabase) {
    throw new Error("Connected to unexpected database.");
  }

  if (!(await Role.exists({ name: "auditor" }))) {
    throw new Error("Auditor role missing.");
  }

  const legacyUsers = await User.find({
    role: "lead_auditor"
  }).lean();

  const expectedIds = plan.users.map(u => u.id).sort();
  const actualIds = legacyUsers.map(u => String(u._id)).sort();

  if (!same(expectedIds, actualIds)) {
    throw new Error("Legacy account set changed since backup.");
  }

  for (const expected of plan.users) {
    const current = legacyUsers.find(
      u => String(u._id) === expected.id
    );

    if (
      !current ||
      current.name !== expected.name ||
      current.active !== expected.active
    ) {
      throw new Error(`Account changed: ${expected.name}`);
    }
  }

  originalAudit = await ScheduledAudit.findById(
    expectedAuditId
  ).lean();

  if (
    !originalAudit ||
    originalAudit.iqaNumber !== expectedIqa ||
    originalAudit.leadAuditor !== "chirag" ||
    !same(
      originalAudit.auditors,
      plan.expectedAudit.currentAuditors
    )
  ) {
    throw new Error("Target audit changed since backup.");
  }

  console.log("=== PREFLIGHT PASSED ===");
  console.log("Database:", mongoose.connection.name);
  console.log("Accounts to migrate:", legacyUsers.length);
  console.log("Audit:", expectedIqa);
  console.log("Old team:", originalAudit.auditors);
  console.log("New team:", plan.expectedAudit.proposedAuditors);

  // Update only the target audit's team membership.
  // The existing team and lead must still match.
  const auditResult = await ScheduledAudit.collection.updateOne(
    {
      _id: originalAudit._id,
      iqaNumber: expectedIqa,
      leadAuditor: "chirag",
      auditors: originalAudit.auditors
    },
    {
      $addToSet: { auditors: "chirag" }
    }
  );

  if (
    auditResult.matchedCount !== 1 ||
    auditResult.modifiedCount !== 1
  ) {
    throw new Error("Guarded audit update did not succeed.");
  }

  auditChanged = true;

  // Convert only the five accounts identified in the plan.
  // No passwords or other account fields are updated.
  for (const expected of plan.users) {
    const result = await User.collection.updateOne(
      {
        _id: new mongoose.Types.ObjectId(expected.id),
        name: expected.name,
        role: "lead_auditor",
        active: expected.active
      },
      {
        $set: { role: "auditor" }
      }
    );

    if (
      result.matchedCount !== 1 ||
      result.modifiedCount !== 1
    ) {
      throw new Error(
        `Guarded account update failed: ${expected.name}`
      );
    }

    changedUsers.push(expected);
  }

  const finalUsers = await User.find({
    _id: {
      $in: plan.users.map(
        u => new mongoose.Types.ObjectId(u.id)
      )
    }
  }).lean();

  const finalAudit = await ScheduledAudit.findById(
    expectedAuditId
  ).lean();

  const remainingLegacy = await User.countDocuments({
    role: "lead_auditor"
  });

  if (
    finalUsers.length !== 5 ||
    finalUsers.some(u => u.role !== "auditor") ||
    remainingLegacy !== 0 ||
    finalAudit.leadAuditor !== "chirag" ||
    !same(
      finalAudit.auditors,
      plan.expectedAudit.proposedAuditors
    )
  ) {
    throw new Error("Post-migration verification failed.");
  }

  console.log("\n=== MIGRATION SUCCESSFUL ===");
  console.log("Accounts converted:", finalUsers.length);
  console.log("Remaining legacy accounts:", remainingLegacy);
  console.log("Audit:", finalAudit.iqaNumber);
  console.log("Lead Auditor:", finalAudit.leadAuditor);
  console.log("Auditor team:", finalAudit.auditors);
  console.log("Original backup preserved.");

} catch (error) {
  console.error("\nMIGRATION ERROR:", error.message);
  process.exitCode = 1;

  if (connected && (auditChanged || changedUsers.length)) {
    console.error("Attempting targeted rollback...");

    let rollbackFailed = false;

    for (const user of [...changedUsers].reverse()) {
      try {
        const result = await User.collection.updateOne(
          {
            _id: new mongoose.Types.ObjectId(user.id),
            role: "auditor"
          },
          {
            $set: { role: "lead_auditor" }
          }
        );

        if (result.modifiedCount !== 1) {
          throw new Error("Rollback update did not match.");
        }

        console.log("Restored account:", user.name);
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error(
          "ACCOUNT ROLLBACK FAILED:",
          user.name,
          rollbackError.message
        );
      }
    }

    if (auditChanged) {
      try {
        const result = await ScheduledAudit.collection.updateOne(
          {
            _id: originalAudit._id,
            leadAuditor: "chirag",
            auditors: plan.expectedAudit.proposedAuditors
          },
          {
            $set: {
              auditors: originalAudit.auditors
            }
          }
        );

        if (result.modifiedCount !== 1) {
          throw new Error("Audit rollback update did not match.");
        }

        console.log("Restored audit team.");
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error(
          "AUDIT ROLLBACK FAILED:",
          rollbackError.message
        );
      }
    }

    console.error(
      rollbackFailed
        ? "MANUAL RECOVERY REQUIRED. Do not rerun."
        : "Targeted rollback completed. Verify database state."
    );
  }
} finally {
  if (connected) await mongoose.disconnect();
}
