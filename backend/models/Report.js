import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    iqrNumber: {
      type: String,
      required: true,
      unique: true,
    },

    auditPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditPlan",
      required: true,
    },

    scheduledAudit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScheduledAudit",
      required: true,
    },

    /*
     * AuditFinding that produced this official IQR.
     *
     * null preserves compatibility with historical Reports.
     * Authorization must NOT be derived from this field.
     */
    sourceFinding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditFinding",
      default: null,
    },

    iqaNumber: {
      type: String,
      required: true,
    },

    prakalpa: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
    },

    sublocation: {
      type: String,
      default: "",
    },

    auditCoordinator: {
      type: String,
      default: "",
    },

    auditors: {
      type: [String],
      default: [],
    },

    // Canonical Lead Auditor copied from the Scheduled Audit.
    // This is historical report metadata only.
    // Authorization must still be derived from ScheduledAudit.
    leadAuditor: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================
    // Audit Metadata
    // =========================

    auditAreas: {
      type: [String],
      default: [],
    },

    purpose: {
      type: String,
      default: "",
    },

    prakalphaPramukh: {
      type: String,
      default: "",
    },

    visitDate: {
      type: Date,
      required: true,
    },

    visitTime: {
      type: String,
      required: true,
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
    },

    proofFiles: {
      type: [String],
      default: [],
    },

    hasChecklist: {
      type: Boolean,
      default: false,
    },

    // =========================
    // Report Lifecycle
    // =========================

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },

    /*
     * Detailed report workflow.
     *
     * status continues to represent the finding lifecycle:
     *   open / closed
     *
     * workflowStatus represents which workflow stage currently
     * owns the report.
     *
     * Existing reports are treated as already-generated official
     * reports for backward compatibility.
     */
    workflowStatus: {
      type: String,
      enum: [
        "auditor_draft",
        "submitted_to_lead",
        "returned_to_auditor",
        "approved_by_lead",
        "submitted_to_coordinator",
        "coordinator_generated",
        "sent_to_prakalpa",
        "action_submitted",
        "returned_to_prakalpa",
        "verified_closed",
      ],
      default: "coordinator_generated",
    },

    reportCreatedOn: {
      type: Date,
      default: null,
    },

    reportClosedOn: {
      type: Date,
      default: null,
    },
    actionTaken: {
      type: String,
      default: "",
    },

    completionRemarks: {
      type: String,
      default: "",
    },

    closedBy: {
      type: String,
      default: "",
    },

    closedAt: {
      type: Date,
      default: null,
    },

    // =========================
    // Workflow Audit Trail
    // =========================

    submittedByAuditor: {
      type: String,
      default: "",
      trim: true,
    },

    submittedToLeadAt: {
      type: Date,
      default: null,
    },

    leadReviewRemarks: {
      type: String,
      default: "",
    },

    leadReviewedAt: {
      type: Date,
      default: null,
    },

    submittedToCoordinatorAt: {
      type: Date,
      default: null,
    },

    coordinatorGeneratedAt: {
      type: Date,
      default: null,
    },

    sentToPrakalpaAt: {
      type: Date,
      default: null,
    },

    actionSubmittedBy: {
      type: String,
      default: "",
      trim: true,
    },

    actionSubmittedAt: {
      type: Date,
      default: null,
    },

    coordinatorVerificationRemarks: {
      type: String,
      default: "",
    },

    verifiedBy: {
      type: String,
      default: "",
      trim: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    workflowHistory: {
      type: [
        {
          action: {
            type: String,
            required: true,
          },

          fromStatus: {
            type: String,
            default: "",
          },

          toStatus: {
            type: String,
            default: "",
          },

          performedBy: {
            type: String,
            default: "",
          },

          role: {
            type: String,
            default: "",
          },

          remarks: {
            type: String,
            default: "",
          },

          performedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },

    // =========================
    // Email Lifecycle
    // =========================

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

/*
 * One AuditFinding may generate at most one official IQR.
 *
 * sparse keeps historical Reports without sourceFinding valid.
 */
reportSchema.index(
  { sourceFinding: 1 },
  {
    unique: true,
    sparse: true,
  }
);

export default mongoose.model(
  "Report",
  reportSchema
);