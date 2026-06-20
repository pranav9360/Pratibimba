const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    required: true
  },

  auditId: String,

  scheduledAuditId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ScheduledAudit"
  },

  prakalpaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Prakalpa"
  },

  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Location"
  },

  internalAuditDate: Date,
  timeVisited: String,

  auditArea: String,
  auditFindings: String,

  classification: {
    type: String,
    enum: ["OFI", "NC"],
    required: true
  },

  status: {
    type: String,
    enum: ["open", "closed"],
    default: "open"
  },

  correctiveAction: String,
  actionTakenByManager: String,
  dateClosed: Date,
  dueDate: Date,

  proofUrl: String,
  checklistUrl: String,
  iqaReportPdfUrl: String
}, { timestamps: true });

module.exports = mongoose.model("Report", reportSchema);