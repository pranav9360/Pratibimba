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


const auditFindingSchema =
  new mongoose.Schema(
    {
      /*
       * Authoritative lifecycle references.
       */
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


      /*
       * Historical organisational snapshot.
       *
       * Authorization must still be derived from ScheduledAudit.
       */
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


      /*
       * Submitter identity.
       *
       * submittedBy is immutable Mongo identity.
       * submittedByName preserves the historical display value.
       */
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

      auditor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      classification: {
        type: String,
        enum: [
          "NC",
          "OFI",
        ],
        default: null,
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "DRAFT",
          "SUBMITTED",
        ],
        default: "DRAFT",
        index: true,
      },

      submittedAt: {
        type: Date,
        default: null,
      },

      /*
       * Finding content.
       */
      auditArea: {
        type: String,
        required: true,
        trim: true,
      },

      severity: {
        type: String,
        enum: [
          "open_for_improvement",
          "non_conformance",
        ],
        required: true,
      },

      findings: {
        type: String,
        required: true,
        trim: true,
      },

      proofFiles: {
        type: [String],
        default: [],
      },

      hasChecklist: {
        type: Boolean,
        default: false,
      },

      visitDate: {
        type: Date,
        required: true,
      },

      visitTime: {
        type: String,
        required: true,
        trim: true,
      },


      /*
       * Pre-IQR workflow.
       */
      workflowStatus: {
        type: String,
        enum: [
          "auditor_draft",
          "submitted_to_lead",
          "returned_to_auditor",
          "approved_by_lead",
          "discarded_by_lead",
          "submitted_to_coordinator",
          "converted_to_report",
          "discarded_by_coordinator",
        ],
        default: "submitted_to_lead",
        index: true,
      },

      submittedToLeadAt: {
        type: Date,
        default: Date.now,
      },

      // Lead review copy; the Auditor's original fields remain immutable.
      leadEditedCopy: {
        findings: { type: String, trim: true },
        severity: { type: String, enum: ["open_for_improvement", "non_conformance"] },
        editedAt: { type: Date },
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        revision: { type: Number, default: 0 },
      },

      leadEvidenceFiles: { type: [String], default: [] },
      withdrawnEvidenceFiles: { type: [{ token: String, by: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, at: Date }], default: [] },
      evidenceReviews: { type: [{
        token: { type: String, required: true },
        leadDropped: { type: Boolean, default: false },
        coordinatorDropped: { type: Boolean, default: false },
        leadReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        coordinatorReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        leadReviewedAt: Date,
        coordinatorReviewedAt: Date,
      }], default: [] },
      leadReviewRemarks: {
        type: String,
        default: "",
        trim: true,
      },

      leadReviewedAt: {
        type: Date,
        default: null,
      },

      submittedToCoordinatorAt: {
        type: Date,
        default: null,
      },

      coordinatorEditedCopy: {
        findings: { type: String, trim: true },
        severity: { type: String, enum: ["open_for_improvement", "non_conformance"] },
        editedAt: Date,
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        revision: { type: Number, default: 0 },
      },
      coordinatorVerifiedAt: { type: Date, default: null },
      coordinatorCompletedAt: { type: Date, default: null },
      coordinatorCompletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

      convertedToReportAt: {
        type: Date,
        default: null,
      },

      report: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Report",
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


/*
 * Common workflow queries.
 */
auditFindingSchema.index({
  scheduledAudit: 1,
  workflowStatus: 1,
});

auditFindingSchema.index({
  submittedBy: 1,
  workflowStatus: 1,
});


export default mongoose.model(
  "AuditFinding",
  auditFindingSchema
);
