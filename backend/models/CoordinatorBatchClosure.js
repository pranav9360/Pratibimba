import mongoose from "mongoose";
const schema = new mongoose.Schema({
 scheduledAudit: {type: mongoose.Schema.Types.ObjectId, ref: "ScheduledAudit", required: true, unique: true},
 coordinator: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
 generatedCount: {type: Number, required: true, min: 0},
 discardedCount: {type: Number, required: true, min: 0},
 closedAt: {type: Date, default: Date.now, required: true},
}, {timestamps: true});
export default mongoose.models.CoordinatorBatchClosure || mongoose.model("CoordinatorBatchClosure",schema);
