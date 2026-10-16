import mongoose from "mongoose";

const superAdminMutationGuardSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    revision: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

export default mongoose.model(
  "SuperAdminMutationGuard",
  superAdminMutationGuardSchema
);
