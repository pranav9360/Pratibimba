import "dotenv/config";
import mongoose from "mongoose";

import User from "../models/User.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Role from "../models/Role.js";

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("STOPPED: MONGO_URI or MONGODB_URI is not configured.");
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);

  console.log("\n=== LEAD AUDITOR MIGRATION PREVIEW ===");
  console.log("MODE: READ ONLY — NO DATABASE CHANGES\n");

  const legacyUsers = await User.find({
    role: "lead_auditor"
  })
    .select("_id name email role active")
    .lean();

  const auditorRole = await Role.findOne({
    name: "auditor"
  }).lean();

  console.log("Auditor role exists:", Boolean(auditorRole));
  console.log("Legacy Lead Auditor accounts:", legacyUsers.length);

  for (const user of legacyUsers) {
    const ledAudits = await ScheduledAudit.find({
      leadAuditor: user.name
    })
      .select("_id iqaNumber leadAuditor auditors")
      .lean();

    const missingTeamMembership = ledAudits.filter(
      audit => !Array.isArray(audit.auditors) ||
        !audit.auditors.includes(user.name)
    );

    console.log("\n-----------------------------------");
    console.log("User:", user.name);
    console.log("Email:", user.email);
    console.log("ID:", String(user._id));
    console.log("Active:", user.active);
    console.log("Audits led:", ledAudits.length);
    console.log(
      "Audits missing auditor-team membership:",
      missingTeamMembership.length
    );

    for (const audit of ledAudits) {
      console.log({
        auditId: String(audit._id),
        iqaNumber: audit.iqaNumber,
        leadAuditor: audit.leadAuditor,
        auditors: audit.auditors,
        needsTeamMembershipRepair:
          missingTeamMembership.some(
            item => String(item._id) === String(audit._id)
          )
      });
    }
  }

  console.log("\n=== MIGRATION PREVIEW COMPLETE ===");
  console.log("No database records were modified.");

} catch (error) {
  console.error("Preview failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
