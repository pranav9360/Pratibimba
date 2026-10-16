import mongoose from "mongoose";
import User from "../../models/User.js";
import Role from "../../models/Role.js";
import { updateRole } from "../../services/roleService.js";
import {
  changeUserRole,
  updateUser,
} from "../../services/userService.js";

const [operation, actorId, targetId] = process.argv.slice(2);

try {
  const parsed = new URL(process.env.SUPERADMIN_CONCURRENCY_MONGO_URI);
  if (parsed.protocol !== "mongodb:" || !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
      parsed.pathname !== "/superadmin_concurrency_test") {
    throw new Error("A verified isolated loopback test database is required.");
  }
  await mongoose.connect(process.env.SUPERADMIN_CONCURRENCY_MONGO_URI);
  const actor = await User.findById(actorId);

  if (!actor) {
    throw new Error("Test actor was not found.");
  }

  if (operation === "demote") {
    await changeUserRole(targetId, "admin", actor);
  } else if (operation === "deactivate") {
    await updateUser(targetId, { active: false }, actor);
  } else if (operation === "edit-role") {
    const definition = await Role.findOne({ name: "super_admin" });
    await updateRole(definition._id, { permissions: { canCreateAuditPlan: true } }, actor);
  } else {
    throw new Error("Unsupported test operation.");
  }

  process.stdout.write("success");
} catch (error) {
  process.stderr.write(`${error.statusCode ?? "error"}:${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
