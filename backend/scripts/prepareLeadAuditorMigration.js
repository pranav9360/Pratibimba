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

if (!uri) {
  console.error("STOPPED: MongoDB connection URI is missing.");
  process.exit(1);
}

const expectedAuditNumber = "IQA-2026-0029";
const expectedLead = "chirag";
const existingAuditor = "Lokesh B.S";

const expectedAuditId = "6a97f36701a7238803f063f4";

function serialize(value) {
  return JSON.stringify(
    value,
    (_key, item) => {
      if (item instanceof mongoose.Types.ObjectId) {
        return { $oid: String(item) };
      }
      return item;
    },
    2
  );
}

try {
  await mongoose.connect(uri);

  const legacyUsers = await User.find({
    role: "lead_auditor"
  }).lean();

  const auditorRole = await Role.findOne({
    name: "auditor"
  }).lean();

  if (!auditorRole) {
    throw new Error("Auditor role does not exist.");
  }

  const audit = await ScheduledAudit.findById(
    expectedAuditId
  ).lean();

  if (!audit) {
    throw new Error("Target audit was not found.");
  }

  if (
    audit.iqaNumber !== expectedAuditNumber ||
    audit.leadAuditor !== expectedLead ||
    !Array.isArray(audit.auditors) ||
    !audit.auditors.includes(existingAuditor)
  ) {
    throw new Error(
      "Audit details have changed since the preview. " +
      "Migration preparation stopped."
    );
  }

  if (legacyUsers.length !== 5) {
    throw new Error(
      `Expected 5 legacy accounts, found ${legacyUsers.length}. ` +
      "Migration preparation stopped."
    );
  }

  const leadAccount = legacyUsers.find(
    user => user.name === expectedLead
  );

  if (!leadAccount || leadAccount.active !== true) {
    throw new Error(
      "Expected active Lead Auditor account was not found."
    );
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const directory = path.join(
    backupRoot,
    `lead-auditor-${timestamp}`
  );

  fs.mkdirSync(directory, {
    recursive: true,
    mode: 0o700
  });

  // Back up complete documents for accurate restoration.
  // These files may contain password hashes and personal data.
  const users = await User.collection.find({}).toArray();
  const audits = await ScheduledAudit.collection.find({}).toArray();
  const roles = await Role.collection.find({}).toArray();

  const collections = {
    users,
    scheduledAudits: audits,
    roles
  };

  for (const [name, documents] of Object.entries(collections)) {
    const destination = path.join(directory, `${name}.json`);

    fs.writeFileSync(
      destination,
      serialize(documents),
      { mode: 0o600 }
    );
  }

  const plannedUsers = legacyUsers.map(user => ({
    id: String(user._id),
    name: user.name,
    fromRole: "lead_auditor",
    toRole: "auditor",
    active: user.active
  }));

  const plan = {
    createdAt: new Date().toISOString(),
    database: mongoose.connection.name,
    status: "PREPARED_NOT_APPLIED",
    expectedAudit: {
      id: expectedAuditId,
      iqaNumber: expectedAuditNumber,
      leadAuditor: expectedLead,
      currentAuditors: audit.auditors,
      proposedAuditors: [
        ...new Set([...audit.auditors, expectedLead])
      ]
    },
    users: plannedUsers,
    backupCollections: {
      users: users.length,
      scheduledAudits: audits.length,
      roles: roles.length
    }
  };

  const planPath = path.join(directory, "migration-plan.json");

  fs.writeFileSync(
    planPath,
    JSON.stringify(plan, null, 2),
    { mode: 0o600 }
  );

  const checksum = crypto
    .createHash("sha256")
    .update(fs.readFileSync(planPath))
    .digest("hex");

  console.log("\n=== MIGRATION PREPARATION SUCCESSFUL ===");
  console.log("Database:", mongoose.connection.name);
  console.log("Backup directory:", directory);
  console.log("Legacy accounts:", plannedUsers.length);
  console.log("Target audit:", expectedAuditNumber);
  console.log("Existing auditor retained:", existingAuditor);
  console.log("Lead Auditor to add:", expectedLead);
  console.log("Migration plan SHA-256:", checksum);
  console.log("\nBACKUP COUNTS:", plan.backupCollections);
  console.log("\nNO DATABASE RECORDS MODIFIED.");

} catch (error) {
  console.error("\nPREPARATION STOPPED:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
