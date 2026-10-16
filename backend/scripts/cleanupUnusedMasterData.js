import "dotenv/config";
import mongoose from "mongoose";

import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("==========================================");
    console.log("SAFE MASTER DATA CLEANUP");
    console.log("==========================================");
    console.log("✅ MongoDB connected\n");

    // -------------------------------------------------
    // 1. TRAINING CENTRE
    // Confirmed by audit:
    // Users: 0
    // Plans: 0
    // Scheduled Audits: 0
    // Reports: 0
    // Locations: 0
    // -------------------------------------------------

    const training = await Prakalpa.findOne({
      name: "Training Centre",
    });

    if (training) {
      training.active = false;
      await training.save();

      console.log("✓ Deactivated Prakalpa: Training Centre");
    } else {
      console.log("• Training Centre already absent");
    }

    // -------------------------------------------------
    // 2. HYDERABAD UNDER YOGA KENDRA
    // Confirmed by audit:
    // Users: 0
    // Plans: 0
    // Scheduled Audits: 0
    // Reports: 0
    // -------------------------------------------------

    const hyderabad = await Location.findOne({
      prakalpa: "Yoga Kendra",
      $or: [
        { name: "Hyderabad" },
        { location: "Hyderabad" },
      ],
    });

    if (hyderabad) {
      hyderabad.active = false;
      await hyderabad.save();

      console.log(
        "✓ Deactivated Location: Yoga Kendra → Hyderabad"
      );
    } else {
      console.log(
        "• Yoga Kendra → Hyderabad already absent"
      );
    }

    // -------------------------------------------------
    // VERIFY
    // -------------------------------------------------

    console.log("\n==========================================");
    console.log("VERIFY");
    console.log("==========================================");

    const trainingCheck = await Prakalpa.findOne({
      name: "Training Centre",
    }).lean();

    const hydCheck = await Location.findOne({
      prakalpa: "Yoga Kendra",
      $or: [
        { name: "Hyderabad" },
        { location: "Hyderabad" },
      ],
    }).lean();

    console.log(
      "Training Centre active:",
      trainingCheck?.active
    );

    console.log(
      "Yoga Kendra → Hyderabad active:",
      hydCheck?.active
    );

    console.log(
      "\nActive Prakalpas:",
      await Prakalpa.countDocuments({
        active: { $ne: false },
      })
    );

    console.log(
      "Active Locations:",
      await Location.countDocuments({
        active: { $ne: false },
      })
    );

    console.log("\n==========================================");
    console.log("CLEANUP COMPLETE");
    console.log("No records permanently deleted.");
    console.log("==========================================");

  } catch (err) {
    console.error("\n❌ CLEANUP FAILED");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();
