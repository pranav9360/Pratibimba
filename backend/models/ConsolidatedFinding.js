import mongoose from "mongoose";

const workflowHistorySchema =
  new mongoose.Schema(
    {
      action: {
        type: String,
        required: true,
        trim: true,
      },

      fromStatus: {
        type: String,
        default: "",
        trim: true,
      },

      toStatus: {
        type: String,
        required: true,
        trim: true,
      },

      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      performedByName: {
        type: String,
        default: "",
        trim: true,
      },

      role: {
        type: String,
        default: "",
        trim: true,
      },

      remarks: {
        type: String,
        default: "",
        trim: true,
      },

      performedAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  );

const consolidatedFindingSchema =
  new mongoose.Schema(
    {
      auditPlan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AuditPlan",
        required: true,
        index: true,
      },

      scheduledAudit: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ScheduledAudit",
        required: true,
        index: true,
      },

      iqaNumber: {
        type: String,
        required: true,
        trim: true,
        index: true,
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

      auditCoordinator: {
        type: String,
        required: true,
        trim: true,
      },

      leadAuditor: {
        type: String,
        required: true,
        trim: true,
      },

      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      submittedByName: {
        type: String,
        required: true,
        trim: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      supportingNotes: {
        type: String,
        default: "",
        trim: true,
      },

      classification: {
        type: String,
        enum: ["NC", "OFI"],
        default: null,
        trim: true,
      },

      // Coordinator's final decision, separate from Lead Auditor classification.
      coordinatorClassification: {
        type: String,
        enum: ["NC", "OFI"],
        default: null,
      },

      coordinatorClassificationReviewedAt: {
        type: Date,
        default: null,
      },

      coordinatorClassificationReviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      status: {
        type: String,
        enum: ["DRAFT", "SUBMITTED"],
        default: "DRAFT",
        index: true,
      },

      workflowStatus: {
        type: String,
        enum: [
          "consolidated_draft",
          "submitted_to_coordinator",
          "converted_to_report",
        ],
        default: "consolidated_draft",
        index: true,
      },

      /*
       * Official IQR generated from this consolidated finding.
       */
      report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Report",
        default: null,
      },

      convertedToReportAt: {
        type: Date,
        default: null,
      },

      sourceFindings: {
        type: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AuditFinding",
          },
        ],
        default: [],
        index: true,
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      submittedToCoordinatorAt: {
        type: Date,
        default: null,
      },

      workflowHistory: {
        type: [workflowHistorySchema],
        default: [],
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.model(
  "ConsolidatedFinding",
  consolidatedFindingSchema
);
