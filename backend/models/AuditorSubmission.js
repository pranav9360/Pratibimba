import mongoose from "mongoose";
const schema = new mongoose.Schema({
  scheduledAudit: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduledAudit", required: true },
  auditor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  auditorName: { type: String, required: true },
  submittedAt: { type: Date, required: true, default: Date.now },
  findingCount: { type: Number, required: true, min: 0 },
  iqaNumber: { type: String, required: true },
}, { timestamps: true });
schema.index({ scheduledAudit: 1, auditor: 1 }, { unique: true });
export default mongoose.models.AuditorSubmission || mongoose.model("AuditorSubmission", schema);
