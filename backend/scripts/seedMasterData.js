import { readFileSync, statSync } from "node:fs";
import dotenv from "dotenv";
import mongoose from "mongoose";

import Domain from "../models/Domain.js";
import Location from "../models/Location.js";
import User from "../models/User.js";

dotenv.config();

// Supply a private JSON object mapping each account email to its initial password.
// Only the file path is configured; password values never appear in CLI arguments.
function readInitialPasswords(emails) {
  const file = process.env.PRATIBIMBA_INITIAL_PASSWORDS_FILE;
  if (!file) throw new Error("Private initial-password configuration is required.");
  const info = statSync(file);
  if (!info.isFile() || (info.mode & 0o077) || info.uid !== process.getuid()) {
    throw new Error("Initial-password file must be owner-only (0600 or stricter).");
  }
  const values = JSON.parse(readFileSync(file, "utf8"));
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new Error("Invalid initial-password configuration.");
  }
  for (const email of emails) {
    if (!Object.hasOwn(values, email) || typeof values[email] !== "string" || values[email].length < 12) {
      throw new Error("Every initial account requires an explicitly supplied strong password.");
    }
  }
  return values;
}

async function seedMasterData() {
const users = [
  {
    name: "Lokesh B.S",
    email: "lokesh.bs@audit.local",
    phone: "9000000001",

    role: "auditor",
    domain: "Mudranalaya",
    assignedDomains: [
      "Mudranalaya",
      "Seva Vasati",
      "JGRV Kalyan Nagar"
    ],
    active: true
  },

  {
    name: "Vani.M",
    email: "vani.m@audit.local",
    phone: "9000000002",

    role: "audit_coordinator",
    domain: "Yoga Kendra",
    assignedDomains: [
      "Yoga Kendra",
      "Blood Center - Bangalore",
      "RV-Chitradurga"
    ],
    active: true
  },

  {
    name: "Paniraj",
    email: "paniraj@audit.local",
    phone: "9000000003",

    role: "auditor",
    domain: "Mudranalaya",
    assignedDomains: [
      "Mudranalaya"
    ],
    active: true
  },

  {
    name: "Ashish Sabnis",
    email: "ashish.sabnis@audit.local",
    phone: "9000000004",

    role: "auditor",
    domain: "Mudranalaya",
    assignedDomains: [
      "Mudranalaya"
    ],
    active: true
  }
];

const initialPasswords = readInitialPasswords(users.map(user => user.email));

// Keep connection failures inside the sanitized setup error handler.
await mongoose.connect(process.env.MONGO_URI);

console.log("Connected to:", mongoose.connection.name);

// =====================================================
// 1. PRAKALPAS / DOMAINS
// =====================================================

const domains = [
  "Seva Vasati",
  "RV-Chitradurga",
  "RV-Hagaribommanahalli",
  "Yoga Kendra",
  "Mudranalaya",
  "JGRV Kalyan Nagar",
  "RV-Dharwad",
  "RV-Holehonnuru",
  "RV-Davanagere",
  "Blood Center - Bangalore",
  "RVK Somanahalli",
  "RVK Mysore - Srinagar",
  "RVK Mysore - Vijayanagar",
  "RVK Satturu",
  "RVK Ballari",
  "RVK Kalaburgi",
  "RVK Udupi",
  "RVK Kerur"
];

for (const name of domains) {
  await Domain.findOneAndUpdate(
    { name },
    {
      name,
      active: true
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

// =====================================================
// 2. LOCATIONS
// =====================================================

const locations = [
  {
    domain: "Seva Vasati",
    name: "Manjunatha Colony",
    sublocations: []
  },
  {
    domain: "RV-Chitradurga",
    name: "Chitradurga",
    sublocations: []
  },
  {
    domain: "RV-Hagaribommanahalli",
    name: "Sharada English Medium School",
    sublocations: []
  },
  {
    domain: "Yoga Kendra",
    name: "Jayanagara",
    sublocations: []
  },
  {
    domain: "Mudranalaya",
    name: "Bangalore",
    sublocations: []
  },
  {
    domain: "JGRV Kalyan Nagar",
    name: "Bangalore",
    sublocations: []
  },
  {
    domain: "Blood Center - Bangalore",
    name: "Bangalore",
    sublocations: []
  }
];

for (const location of locations) {
  await Location.findOneAndUpdate(
    {
      domain: location.domain,
      name: location.name
    },
    {
      ...location,
      active: true
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
}

// =====================================================
// 3. USERS / AUDITORS
// =====================================================
//
// IMPORTANT:
// These use ONLY roles supported by your backend.
// Change email/phone/password if your User model requires
// different values.
//
// =====================================================



for (const user of users) {
  const existing = await User.findOne({ email: user.email });
  if (existing) {
    // Keep the original profile/assignment update behavior without touching passwords.
    await User.findOneAndUpdate({ email: user.email }, user, { new: true });
  } else {
    // User.save middleware hashes new passwords; query upserts do not run it.
    await User.create({ ...user, password: initialPasswords[user.email] });
  }
}

// =====================================================
// 4. VERIFY
// =====================================================

console.log("\n======================================");
console.log("MASTER DATA SEED COMPLETE");
console.log("======================================");

console.log("\nDATABASE:");
console.log(mongoose.connection.name);

console.log("\nDOMAINS / PRAKALPAS:");

const domainDocs = await Domain
  .find({})
  .select("name active")
  .sort({ name: 1 })
  .lean();

console.table(domainDocs);

console.log("\nLOCATIONS:");

const locationDocs = await Location
  .find({})
  .select("domain name sublocations active")
  .sort({ domain: 1, name: 1 })
  .lean();

console.table(locationDocs);

console.log("\nUSERS:");

const userDocs = await User
  .find({})
  .select("name email role domain assignedDomains active")
  .sort({ name: 1 })
  .lean();

console.table(userDocs);

await mongoose.disconnect();

console.log("\nDisconnected.");
}

seedMasterData().catch(async () => {
  console.error("Master-data setup failed; no credential details are logged.");
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
