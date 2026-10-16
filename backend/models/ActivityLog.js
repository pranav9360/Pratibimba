import mongoose from "mongoose";

const actorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    email: { type: String, default: "" },
    role: { type: String },
  },
  { _id: false }
);

// Existing user-target history remains valid; role events add a typed target.
const targetSchema = new mongoose.Schema({
  entityType: { type: String, enum: ["user", "role"], default: "user" },
  userId: { type: mongoose.Schema.Types.ObjectId, required() { return this.entityType === "user"; } },
  roleId: { type: mongoose.Schema.Types.ObjectId, required() { return this.entityType === "role"; } },
  name: { type: String, required: true },
  email: { type: String, default: "", required() { return this.entityType === "user"; } },
}, { _id: false });

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: actorSchema, required: true },
    target: { type: targetSchema, required: true },
    action: {
      type: String,
      required: true,
      enum: ["user_role_changed", "superadmin_account_updated", "user_account_updated",
        "role_created", "role_updated", "role_deactivated", "password_changed", "password_reset"],
    },
    oldValue: { type: mongoose.Schema.Types.Mixed, required: true },
    newValue: { type: mongoose.Schema.Types.Mixed, required: true },
    occurredAt: { type: Date, default: Date.now, required: true },
  },
  { versionKey: false }
);

activityLogSchema.index({ occurredAt: -1 });

export default mongoose.model("ActivityLog", activityLogSchema);
