const mongoose = require("mongoose");

const scheduledAuditSchema = new mongoose.Schema({
  auditId: String,

  auditPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "AuditPlan"
  },

  prakalpaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prakalpa"
  },

  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location"
  },

  auditPlannedDate: Date,
  auditStartDate: Date,
  auditEndDate: Date,

  auditCoordinator: String,
  finalizedAuditor: String,
  auditPurpose: String,

  auditAreas: [String],

  status: {
    type: String,
    enum: ["scheduled", "in_progress", "completed"],
    default: "scheduled"
  }
}, { timestamps: true });

module.exports = mongoose.model("ScheduledAudit", scheduledAuditSchema);