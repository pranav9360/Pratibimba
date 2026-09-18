import mongoose from "mongoose";

const auditPlanSchema =
  new mongoose.Schema(
    {
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

      auditPlannedDate: {
        type: Date,
        required: true,
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

      auditors: [
        {
          type: String,
        },
      ],

      purpose: {
        type: String,
        default: "",
        trim: true,
      },

      status: {
        type: String,
        enum: [
          "pending",
          "scheduled",
          "completed",
        ],
        default: "pending",
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

auditPlanSchema
  .virtual("id")
  .get(function () {
    return this._id.toString();
  });

auditPlanSchema
  .virtual("createdDate")
  .get(function () {
    return this.createdAt;
  });

export default mongoose.model(
  "AuditPlan",
  auditPlanSchema
);
