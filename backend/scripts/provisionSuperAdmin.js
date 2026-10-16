import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import ActivityLog from "../models/ActivityLog.js";
import Role from "../models/Role.js";
import User from "../models/User.js";
import {
  acquireBootstrapLock,
  releaseBootstrapLock,
} from "../services/bootstrapLockService.js";

dotenv.config();

const args = process.argv.slice(2);
const emailIndex = args.indexOf("--email");
const email = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : "";

if (!email || !args.includes("--confirm")) {
  console.error(
    "Usage: npm run provision-superadmin -- --email <existing-admin-email> --confirm"
  );
  process.exit(1);
}

let lockOwner;

try {
  await connectDB();

  lockOwner = await acquireBootstrapLock();

  const currentSuperAdmin = await User.findOne({
    role: "super_admin",
    active: true,
  }).select("_id");

  if (currentSuperAdmin) {
    throw new Error("An active Superadmin already exists; provisioning is bootstrap-only.");
  }

  const user = await User.findOne({ email });

  if (!user || !user.active || user.role !== "admin") {
    throw new Error("The selected account must be an existing active Admin.");
  }

  await Role.findOneAndUpdate(
    { name: "super_admin" },
    {
      name: "super_admin",
      active: true,
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
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const previousRole = user.role;
  user.role = "super_admin";
  await user.save();

  await ActivityLog.create({
    actor: { name: "Initial Superadmin provisioning" },
    target: { userId: user._id, name: user.name, email: user.email },
    action: "user_role_changed",
    oldValue: { role: previousRole },
    newValue: { role: "super_admin" },
  });

  console.log(`Provisioned ${user.email} as the initial Superadmin.`);
} catch (error) {
  console.error(`Superadmin provisioning failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (lockOwner) {
    try {
      await releaseBootstrapLock(lockOwner);
    } catch (error) {
      console.error(`Unable to release Superadmin provisioning lock: ${error.message}`);
      process.exitCode = 1;
    }
  }

  await mongoose.disconnect();
}
