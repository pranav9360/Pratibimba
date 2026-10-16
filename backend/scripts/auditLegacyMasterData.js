import "dotenv/config";
import mongoose from "mongoose";

import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";
import User from "../models/User.js";
import AuditPlan from "../models/AuditPlan.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";

const LEGACY_PRAKALPAS = [
  "Blood Bank",
  "Community Centre",
  "School",
  "Training Centre",
];

const LEGACY_LOCATIONS = [
  "Chennai",
  "Mumbai",
  "Pune",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
];

async function countReferences(Model, value) {
  if (!Model) return 0;

  try {
    return await Model.countDocuments({
      $or: [
        { prakalpa: value },
        { location: value },
        { sublocation: value },
        { subLocation: value },
      ],
    });
  } catch {
    return 0;
  }
}

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("==========================================");
    console.log("LEGACY MASTER DATA SAFETY AUDIT");
    console.log("==========================================");
    console.log("✅ MongoDB connected\n");

    console.log("1. LEGACY PRAKALPAS");
    console.log("------------------------------------------");

    for (const name of LEGACY_PRAKALPAS) {
      const p = await Prakalpa.findOne({ name });

      if (!p) {
        console.log(`✓ ${name}: not found`);
        continue;
      }

      const users = await User.countDocuments({ prakalpa: name });
      const plans = await countReferences(AuditPlan, name);
      const scheduled = await countReferences(ScheduledAudit, name);
      const reports = await countReferences(Report, name);
      const locations = await Location.countDocuments({ prakalpa: name });

      console.log(`\n• ${name}`);
      console.log(`  ID: ${p._id}`);
      console.log(`  Active: ${p.active}`);
      console.log(`  Users: ${users}`);
      console.log(`  Audit Plans: ${plans}`);
      console.log(`  Scheduled Audits: ${scheduled}`);
      console.log(`  Reports: ${reports}`);
      console.log(`  Locations: ${locations}`);
    }

    console.log("\n\n2. POSSIBLE LEGACY LOCATIONS");
    console.log("------------------------------------------");

    for (const name of LEGACY_LOCATIONS) {
      const docs = await Location.find({
        $or: [
          { name },
          { location: name },
        ],
      });

      if (!docs.length) {
        console.log(`✓ ${name}: not found`);
        continue;
      }

      console.log(`\n• ${name}`);

      for (const loc of docs) {
        console.log(`  ID: ${loc._id}`);
        console.log(`  Prakalpa: ${loc.prakalpa || "(none)"}`);
        console.log(`  Active: ${loc.active}`);
        console.log(
          `  Sublocations: ${
            Array.isArray(loc.sublocations)
              ? loc.sublocations.join(", ") || "(none)"
              : "(none)"
          }`
        );
      }

      const users = await User.countDocuments({
        $or: [
          { location: name },
          { sublocation: name },
          { subLocation: name },
        ],
      });

      const plans = await countReferences(AuditPlan, name);
      const scheduled = await countReferences(ScheduledAudit, name);
      const reports = await countReferences(Report, name);

      console.log(`  User references: ${users}`);
      console.log(`  Audit Plan references: ${plans}`);
      console.log(`  Scheduled Audit references: ${scheduled}`);
      console.log(`  Report references: ${reports}`);
    }

    console.log("\n\n3. DATABASE TOTALS");
    console.log("------------------------------------------");

    console.log(
      "Active Prakalpas:",
      await Prakalpa.countDocuments({ active: { $ne: false } })
    );

    console.log(
      "Active Locations:",
      await Location.countDocuments({ active: { $ne: false } })
    );

    console.log("\n==========================================");
    console.log("AUDIT COMPLETE — DATABASE NOT MODIFIED");
    console.log("==========================================");

  } catch (err) {
    console.error("\n❌ AUDIT FAILED");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
