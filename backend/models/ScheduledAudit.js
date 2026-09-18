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
