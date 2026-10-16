import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../config/db.js";

import Role from "../models/Role.js";
import Domain from "../models/Domain.js";
import Location from "../models/Location.js";

dotenv.config();

await connectDB();

console.log("\n🚀 Starting Master Seed...\n");

/* =====================================================
   ROLES + PERMISSIONS
===================================================== */

const roles = [
  {
    name: "super_admin",
    permissions: {
      canCreateAuditPlan: true,
      canScheduleAudit: true,
      canEditReport: true,
      canCloseReport: true,
      canViewAllReports: true,
      canManageRoles: true,
      canManageUsers: true,
      canViewDashboard: true,
      canAddAuditor: true,
      canManagePrakalpas: true,
      canManageAdmins: true,
    },
  },
  {
    name: "admin",
    permissions: {
      canCreateAuditPlan: true,
      canScheduleAudit: true,
      canEditReport: true,
      canCloseReport: true,
      canViewAllReports: true,
      canManageRoles: true,
      canManageUsers: true,
      canViewDashboard: true,
      canAddAuditor: true,
    },
  },

  {
    name: "audit_coordinator",
    permissions: {
      canCreateAuditPlan: false,
      canScheduleAudit: true,
      canEditReport: true,
      canCloseReport: false,
      canViewAllReports: false,
      canManageRoles: false,
      canManageUsers: false,
      canViewDashboard: true,
      canAddAuditor: false,
    },
  },

  {
    name: "auditor",
    permissions: {
      canCreateAuditPlan: false,
      canScheduleAudit: false,
      canEditReport: true,
      canCloseReport: false,
      canViewAllReports: false,
      canManageRoles: false,
      canManageUsers: false,
      canViewDashboard: true,
      canAddAuditor: false,
    },
  },

  {
    name: "prakalpa_manager",
    permissions: {
      canCreateAuditPlan: false,
      canScheduleAudit: false,
      canEditReport: false,
      canCloseReport: false,
      canViewAllReports: false,
      canManageRoles: false,
      canManageUsers: false,
      canViewDashboard: true,
      canAddAuditor: false,
    },
  },
];

/* =====================================================
   DOMAINS
===================================================== */

const domains = [
  "Yoga Kendra",
  "Blood Bank",
  "Training Centre",
  "School",
  "Community Centre",
];

/* =====================================================
   LOCATIONS
===================================================== */

const locations = [
  {
    domain: "Yoga Kendra",
    name: "Bengaluru",
    sublocations: ["Jayanagar"],
  },
  {
    domain: "Yoga Kendra",
    name: "Hyderabad",
    sublocations: ["Mehdipatnam"],
  },
  {
    domain: "Blood Bank",
    name: "Mumbai",
    sublocations: ["Dadar"],
  },
  {
    domain: "Blood Bank",
    name: "Chennai",
    sublocations: ["Kilpauk"],
  },
  {
    domain: "School",
    name: "Delhi",
    sublocations: ["Dwarka"],
  },
  {
    domain: "Community Centre",
    name: "Pune",
    sublocations: ["Kothrud"],
  },
];

/* =====================================================
   SEED ROLES
===================================================== */

for (const role of roles) {

  await Role.findOneAndUpdate(
    { name: role.name },
    role,
    {
      upsert: true,
      new: true,
    }
  );

  console.log(`✅ Role : ${role.name}`);
}

/* =====================================================
   SEED DOMAINS
===================================================== */

for (const name of domains) {

  await Domain.findOneAndUpdate(
    { name },
    { name },
    {
      upsert: true,
      new: true,
    }
  );

  console.log(`✅ Domain : ${name}`);
}

/* =====================================================
   SEED LOCATIONS
===================================================== */

for (const location of locations) {

  await Location.findOneAndUpdate(
    {
      domain: location.domain,
      name: location.name,
    },
    location,
    {
      upsert: true,
      new: true,
    }
  );

  console.log(`✅ Location : ${location.domain} -> ${location.name}`);
}

console.log("\n🎉 Phase 4 Master Data Seed Complete.");

await mongoose.disconnect();

process.exit(0);