import mongoose from "mongoose";
import dotenv from "dotenv";
import Prakalpa from "../models/Prakalpa.js";

dotenv.config();

const KNOWN = {
  "Seva Vasati": "Veeresh",
  "Yoga Kendra": "Nagendra Kamath",
  "Mudranalaya": "Nagendra",
  "JGRV Kalyan Nagar": "Gayathri",
  "Blood Center - Bangalore": "Anuradha",
};

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  console.log("\n===== SYNCING KNOWN PRAKALPA PRAMUKHS =====\n");

  for (const [name, prakalpaPramukh] of Object.entries(KNOWN)) {
    const prakalpa = await Prakalpa.findOne({ name });

    if (!prakalpa) {
      console.log(`⚠ NOT FOUND: ${name}`);
      continue;
    }

    console.log(
      `${name}: "${prakalpa.prakalpaPramukh || ""}" -> "${prakalpaPramukh}"`
    );

    prakalpa.prakalpaPramukh = prakalpaPramukh;
    await prakalpa.save();
  }

  console.log("\n===== VERIFY =====\n");

  const result = await Prakalpa.find({
    name: { $in: Object.keys(KNOWN) }
  })
    .select("name prakalpaPramukh auditAreas active")
    .sort({ name: 1 })
    .lean();

  console.table(
    result.map((p) => ({
      Prakalpa: p.name,
      Pramukh: p.prakalpaPramukh,
      "Audit Areas": p.auditAreas?.length || 0,
      Active: p.active,
    }))
  );

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
