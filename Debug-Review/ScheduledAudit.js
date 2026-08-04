import mongoose from "mongoose";

const scheduledAuditSchema = new mongoose.Schema(
  {
    auditPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuditPlan",
      required: true,
      unique: true,
    },

    iqaNumber: {
      type: String,
      required: true,
      trim: true,
    },

    domain: {
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

    prakalpa: {
      type: String,
      default: "",
      trim: true,
    },

    purpose: {
      type: String,
      default: "",
      trim: true,
    },

    auditCoordinator: {
      type: String,
      required: true,
      trim: true,
    },

    prakalphaPramukh: {
      type: String,
      required: true,
      trim: true,
    },

    auditAreas: [
      {
        type: String,
      },
    ],

    auditPlannedDate: {
      type: Date,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    auditors: [
      {
        type: String,
      },
    ],

    finalAuditor: {
      type: String,
      required: true,
      trim: true,
    },

    mailSent: {
      type: Boolean,
      default: false,
    },

    scheduledDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

scheduledAuditSchema.virtual("id").get(function () {
  return this._id.toString();
});

scheduledAuditSchema.virtual("createdDate").get(function () {
  return this.createdAt;
});

export default mongoose.model("ScheduledAudit", scheduledAuditSchema);