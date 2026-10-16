import "dotenv/config";
import mongoose from "mongoose";

import Prakalpa from "../models/Prakalpa.js";
import Location from "../models/Location.js";

/*
 * Master data extracted from Plan(2).xlsx.
 *
 * Sources:
 * - Prakalpa names: Prakalpa + Audit Areas + actual Plan records
 * - Audit-area applicability: Audit Areas sheet
 * - Locations: actual Plan sheet where available
 *
 * This script uses upsert operations and is safe to run repeatedly.
 */

const AUDIT_AREA_MAP = {
  "Yoga Kendra": [
    "Repairs & Maintenance",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "Seva Vasati": [
    "SOPs",
    "Compliance",
  ],

  "Samvit": [
    "SOPs",
  ],

  "Human Resource (HR)": [
    "SOPs",
    "Compliance",
  ],

  "Finance and Accounts": [
    "SOPs",
    "Compliance",
  ],

  "Tapas": [
    "Repairs & Maintenance",
    "IT",
    "SOPs",
    "Compliance",
  ],

  "Saadhana": [
    "Repairs & Maintenance",
    "IT",
    "SOPs",
    "Compliance",
  ],

  "Blood Center - Bangalore": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "Blood Center - Huballi": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "Madhav Srushti": [
    "Repairs & Maintenance",
    "Human Resource",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Davanagere": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Banashankari": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK-A Thanisandra": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "JGRVK Ramamurthy Nagara": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "Sahitya": [
    "Human Resource",
    "SOPs",
  ],

  "Mudranalaya": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "Prashikshana Bharati": [
    "SOPs",
    "Compliance",
  ],

  "Quality and Systems": [
    "SOPs",
  ],

  "HO Admin & Facilities": [
    "Repairs & Maintenance",
    "Human Resource",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Mysore - Srinagar": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Mysore - Vijayanagar": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Dharwad": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Hagaribommanahalli": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "Media": [
    "SOPs",
    "Compliance",
  ],

  "JGRV Kalyan Nagar": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "RV-Holehonnuru": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "RV-Davanagere": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "RV-Chitradurga": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "RV-Dharwad": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "RV-Hagaribommanahalli": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "SOPs",
    "Compliance",
  ],

  "Resource mobilization": [
    "SOPs",
    "Compliance",
  ],

  "Transport": [
    "SOPs",
    "Compliance",
  ],

  "Maintenance": [
    "SOPs",
    "Compliance",
  ],

  "RVK Mangaluru": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Kalaburgi": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "RVK Satturu": [
    "Repairs & Maintenance",
    "Human Resource",
    "IT",
    "Administration",
    "Transport",
    "SOPs",
    "Compliance",
  ],

  "IT": [
    "SOPs",
    "Compliance",
  ],
};

/*
 * Locations below come from actual Plan records.
 * These are the combinations the workbook is actually using
 * when audits are created.
 */

const PLAN_LOCATIONS = {
  "Blood Center - Bangalore": ["Bangalore"],
  "Blood Center - Huballi": ["Huballi"],
  "JGRV Kalyan Nagar": ["Bangalore"],
  "Madhav Srushti": ["Ghati"],
  "Mudranalaya": ["Bangalore"],

  "RV-Chitradurga": ["Chitradurga"],
  "RV-Davanagere": ["Davanagere"],
  "RV-Dharwad": ["Mummigatti Dharwad"],
  "RV-Hagaribommanahalli": ["Sharada English Medium School"],
  "RV-Holehonnuru": ["Holehonnuru"],

  "RVK Ballari": ["Ballari"],
  "RVK Hangal": ["Haveri"],
  "RVK Hassan": ["Hassan"],
  "RVK Kalaburgi": ["Kalaburgi"],
  "RVK Kerur": ["Bagalkote"],
  "RVK Mysore - Srinagar": ["Mysore"],
  "RVK Mysore - Vijayanagar": ["Mysore"],
  "RVK Satturu": ["Dharwad"],
  "RVK Somanahalli": ["Bangalore"],
  "RVK Udupi": ["Udupi"],

  "Seva Vasati": ["Manjunatha Colony"],

  "Yoga Kendra": [
    "Jayanagara",
    "Kamakshipalya",
    "Kundalahalli",
    "Nagarabhavi",
    "RBI Layout",
    "Sadashiva Nagara",
    "Sunkenahalli",
    "Vijayanagara",
  ],
};

/*
 * Additional Prakalpas present in the workbook's Prakalpa master
 * but without applicable Audit Areas or active Plan locations.
 *
 * We retain them so the master list is complete.
 */

const ADDITIONAL_PRAKALPAS = [
  "JMRH & RC",
  "Swasthya Bharati",
  "Samraksha",
  "Utthana",
  "RV-Sriramapura",
  "RVK Mangaluru",
  "CBSE R&D",
  "Goshala (Mudenahalli)",
  "RV Munganahalli",
  "LSVB Ullala",
];

/*
 * Some newer Plan records contain Prakalpas not present in the
 * Audit Areas sheet. Keep them available in the master.
 */

const PLAN_ONLY_PRAKALPAS = [
  "RVK Ballari",
  "RVK Hangal",
  "RVK Hassan",
  "RVK Kerur",
  "RVK Somanahalli",
  "RVK Udupi",
];

function clean(value) {
  return String(value ?? "").trim();
}

async function main() {
  console.log("==========================================");
  console.log("PRATIBIMBA MASTER DATA IMPORT");
  console.log("==========================================\n");

  await mongoose.connect(process.env.MONGO_URI);

  console.log("✅ MongoDB connected\n");

  const allPrakalpas = new Set([
    ...Object.keys(AUDIT_AREA_MAP),
    ...Object.keys(PLAN_LOCATIONS),
    ...ADDITIONAL_PRAKALPAS,
    ...PLAN_ONLY_PRAKALPAS,
  ]);

  // ----------------------------------------------------------
  // PRAKALPAS
  // ----------------------------------------------------------

  console.log("1. Updating Prakalpas...\n");

  let prakalpaCount = 0;

  for (const rawName of allPrakalpas) {
    const name = clean(rawName);

    if (!name) continue;

    const auditAreas =
      AUDIT_AREA_MAP[name] || [];

    await Prakalpa.findOneAndUpdate(
      { name },
      {
        $set: {
          name,
          auditAreas,
          active: true,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    console.log(
      `✓ ${name} | ${
        auditAreas.length
          ? auditAreas.join(", ")
          : "No audit areas configured"
      }`
    );

    prakalpaCount++;
  }

  // ----------------------------------------------------------
  // LOCATIONS
  // ----------------------------------------------------------

  console.log("\n2. Updating Plan locations...\n");

  let locationCount = 0;

  for (const [rawPrakalpa, locations] of Object.entries(
    PLAN_LOCATIONS
  )) {
    const prakalpa = clean(rawPrakalpa);

    for (const rawLocation of locations) {
      const name = clean(rawLocation);

      if (!name) continue;

      await Location.findOneAndUpdate(
        {
          prakalpa,
          name,
        },
        {
          $set: {
            prakalpa,
            name,
            active: true,
          },

          $setOnInsert: {
            sublocations: [],
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log(`✓ ${prakalpa} → ${name}`);

      locationCount++;
    }
  }

  // ----------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------

  const dbPrakalpas =
    await Prakalpa.find({ active: true })
      .sort({ name: 1 })
      .lean();

  const dbLocations =
    await Location.find({ active: true })
      .sort({
        prakalpa: 1,
        name: 1,
      })
      .lean();

  console.log("\n==========================================");
  console.log("IMPORT COMPLETE");
  console.log("==========================================");

  console.log(
    `Prakalpas processed: ${prakalpaCount}`
  );

  console.log(
    `Plan locations processed: ${locationCount}`
  );

  console.log(
    `Active Prakalpas now in DB: ${dbPrakalpas.length}`
  );

  console.log(
    `Active Locations now in DB: ${dbLocations.length}`
  );

  console.log("\n==========================================");
  console.log("PRAKALPA → AUDIT AREA CHECK");
  console.log("==========================================\n");

  for (const p of dbPrakalpas) {
    console.log(`• ${p.name}`);

    console.log(
      `  Audit Areas: ${
        p.auditAreas?.length
          ? p.auditAreas.join(", ")
          : "(none)"
      }`
    );
  }

  console.log("\n==========================================");
  console.log("PRAKALPA → LOCATION CHECK");
  console.log("==========================================\n");

  for (const p of dbPrakalpas) {
    const locations = dbLocations.filter(
      (l) => l.prakalpa === p.name
    );

    if (!locations.length) continue;

    console.log(`• ${p.name}`);

    for (const l of locations) {
      console.log(`    ↳ ${l.name}`);

      if (l.sublocations?.length) {
        console.log(
          `       Sublocations: ${l.sublocations.join(", ")}`
        );
      }
    }
  }

  await mongoose.disconnect();

  console.log("\n✅ Finished safely.");
}

main().catch(async (err) => {
  console.error("\n❌ IMPORT FAILED");
  console.error(err);

  try {
    await mongoose.disconnect();
  } catch {}

  process.exit(1);
});
