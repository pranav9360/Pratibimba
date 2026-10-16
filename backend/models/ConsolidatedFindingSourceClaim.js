import mongoose from "mongoose";

const consolidatedFindingSourceClaimSchema =
  new mongoose.Schema(
    {
      scheduledAudit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScheduledAudit",
        required: true,
        index: true,
      },

      consolidatedFinding: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ConsolidatedFinding",
        required: true,
        index: true,
      },

      sourceFinding: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AuditFinding",
        required: true,
      },

      status: {
        type: String,
        enum: ["active", "released"],
        default: "active",
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

consolidatedFindingSourceClaimSchema.index(
  { sourceFinding: 1 },
  { unique: true }
);

export default mongoose.model(
  "ConsolidatedFindingSourceClaim",
  consolidatedFindingSourceClaimSchema
);
