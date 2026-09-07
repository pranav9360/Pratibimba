import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";

import Domain from "../models/Domain.js";
import Location from "../models/Location.js";
import User from "../models/User.js";

dotenv.config();

await connectDB();

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

const users = [
  {
    name: "Lokesh B.S",
    email: "lokesh.bs@audit.local",
    phone: "9000000001",
    password: "ChangeMe123!",
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
    password: "ChangeMe123!",
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
    password: "ChangeMe123!",
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
    password: "ChangeMe123!",
    role: "lead_auditor",
    domain: "Mudranalaya",
    assignedDomains: [
      "Mudranalaya"
    ],
    active: true
  }
];

for (const user of users) {
  await User.findOneAndUpdate(
    { email: user.email },
    user,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );
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