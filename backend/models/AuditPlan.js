const mongoose = require("mongoose");

const auditPlanSchema = new mongoose.Schema({
  auditId: {
    type: String,
    unique: true,
    required: true
  },

  prakalpaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prakalpa",
    required: true
  },

  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location"
  },

  auditPlannedDate: Date,
  expectedEndDate: Date,

  auditCoordinator: String,
  auditPurpose: String,
  mostProbableAuditor: String,

  auditAreas: [String],

  planPassword: String,

  status: {
    type: String,
    enum: ["planned", "scheduled", "cancelled"],
    default: "planned"
  }
}, { timestamps: true });

module.exports = mongoose.model("AuditPlan", auditPlanSchema);