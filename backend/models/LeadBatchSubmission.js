import mongoose from "mongoose";
const handoverSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  confirmation: { type: String, required: true },
  findingIds: [{ type: mongoose.Schema.Types.ObjectId }],
  leadAuditor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedCount: { type: Number, required: true, min: 0 },
  discardedCount: { type: Number, required: true, min: 0 },
  submittedAt: { type: Date, required: true },
}, { _id: false });
const schema = new mongoose.Schema({
  scheduledAudit: { type: mongoose.Schema.Types.ObjectId, ref: "ScheduledAudit", required: true },
  leadAuditor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  approvedCount: { type: Number, required: true, min: 0 },
  discardedCount: { type: Number, required: true, min: 0 },
  submittedAt: { type: Date, default: Date.now, required: true },
  // Optional: historical initial handovers contain counts only.
  initialHandover: { type: handoverSchema, default: undefined },
  supplementalHandovers: { type: [handoverSchema], default: [] },
}, { timestamps: true });
schema.index({ scheduledAudit: 1 }, { unique: true });
export default mongoose.models.LeadBatchSubmission || mongoose.model("LeadBatchSubmission", schema);
