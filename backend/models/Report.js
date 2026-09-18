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

export default mongoose.model(
  "Report",
  reportSchema
);