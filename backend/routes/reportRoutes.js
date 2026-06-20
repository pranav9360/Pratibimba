const express = require("express");
const router = express.Router();

const Report = require("../models/Report");
const ScheduledAudit = require("../models/ScheduledAudit");

function generateReportId(count) {
  const year = new Date().getFullYear();
  return `IQR${year}${String(count + 1).padStart(5, "0")}`;
}

router.get("/", async (req, res) => {
  try {
    const filters = {};

    if (req.query.reportId) filters.reportId = req.query.reportId;
    if (req.query.auditId) filters.auditId = req.query.auditId;
    if (req.query.prakalpaId) filters.prakalpaId = req.query.prakalpaId;
    if (req.query.locationId) filters.locationId = req.query.locationId;
    if (req.query.classification) filters.classification = req.query.classification;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.auditArea) filters.auditArea = req.query.auditArea;

    const reports = await Report.find(filters)
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const count = await Report.countDocuments();
    const reportId = generateReportId(count);

    const scheduledAudit = await ScheduledAudit.findById(req.body.scheduledAuditId);

    const report = await Report.create({
      ...req.body,
      reportId,
      auditId: scheduledAudit?.auditId,
      prakalpaId: scheduledAudit?.prakalpaId,
      locationId: scheduledAudit?.locationId
    });

    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await Report.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/open/list", async (req, res) => {
  try {
    const reports = await Report.find({ status: "open" })
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;