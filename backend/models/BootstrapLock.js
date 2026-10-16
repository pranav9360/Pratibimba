import mongoose from "mongoose";

const bootstrapLockSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    owner: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);

export default mongoose.model("BootstrapLock", bootstrapLockSchema);
