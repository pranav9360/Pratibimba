const express = require("express");
const router = express.Router();

const ScheduledAudit = require("../models/ScheduledAudit");

router.get("/", async (req, res) => {
  try {
    const filters = {};

    if (req.query.auditId) filters.auditId = req.query.auditId;
    if (req.query.prakalpaId) filters.prakalpaId = req.query.prakalpaId;
    if (req.query.locationId) filters.locationId = req.query.locationId;
    if (req.query.auditCoordinator) filters.auditCoordinator = req.query.auditCoordinator;
    if (req.query.status) filters.status = req.query.status;

    const audits = await ScheduledAudit.find(filters)
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    res.json(audits);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const updated = await ScheduledAudit.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;