import mongoose from "mongoose";

const scheduledAuditSchema =
  new mongoose.Schema(
    {
      auditPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AuditPlan",
        required: true,
        unique: true,
      },

      iqaNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },

      prakalpa: {
        type: String,
        required: true,
        trim: true,
      },

      location: {
        type: String,
        required: true,
        trim: true,
      },

      sublocation: {
        type: String,
        default: "",
        trim: true,
      },

      prakalphaPramukh: {
        type: String,
        default: "",
        trim: true,
      },

      auditCoordinator: {
        type: String,
        required: true,
        trim: true,
      },

      auditors: {
        type: [String],
        default: [],
      },

      // Canonical Lead Auditor assignment.
      // Stored separately from auditors[] because the Lead Auditor
      // has different workflow permissions and responsibilities.
      leadAuditor: {
        type: String,
        default: "",
        trim: true,
      },

      workflowMode: {
        type: String,
        enum: ["legacy", "consolidated"],
        default: "legacy",
      },

      // Shared transaction write-conflict counter for audit outcome changes.
      workflowRevision: {
        type: Number,
        default: 0,
        min: 0,
      },

      auditAreas: {
        type: [String],
        default: [],
      },

      purpose: {
        type: String,
        default: "",
      },

      startDate: {
        type: Date,
        required: true,
      },

      endDate: {
        type: Date,
        required: true,
      },

      status: {
        type: String,
        enum: [
          "upcoming",
          "ongoing",
          "completed",
        ],
        default: "upcoming",
      },

      outcome: { type: String, enum: ['all_clear', 'consolidated_findings', 'legacy_approved_findings'], default: undefined },
      completedAt: { type: Date, default: null },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

      mailSent: {
        type: Boolean,
        default: false,
      },

      mailSentAt: {
        type: Date,
        default: null,
      },

      mailSentTo: {
        type: [String],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "ScheduledAudit",
  scheduledAuditSchema
);
