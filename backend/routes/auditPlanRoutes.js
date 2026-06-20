const express = require("express");
const router = express.Router();

const AuditPlan = require("../models/AuditPlan");
const ScheduledAudit = require("../models/ScheduledAudit");

function generateAuditId(count) {
  const year = new Date().getFullYear();
  return `IQA${year}${String(count + 1).padStart(5, "0")}`;
}

router.get("/", async (req, res) => {
  try {
    const filters = {};

    if (req.query.auditId) filters.auditId = req.query.auditId;
    if (req.query.prakalpaId) filters.prakalpaId = req.query.prakalpaId;
    if (req.query.locationId) filters.locationId = req.query.locationId;
    if (req.query.auditCoordinator) filters.auditCoordinator = req.query.auditCoordinator;
    if (req.query.status) filters.status = req.query.status;

    const plans = await AuditPlan.find(filters)
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const count = await AuditPlan.countDocuments();
    const auditId = generateAuditId(count);

    const plan = await AuditPlan.create({
      ...req.body,
      auditId
    });

    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/schedule", async (req, res) => {
  try {
    const plan = await AuditPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ message: "Audit plan not found" });
    }

    const scheduledAudit = await ScheduledAudit.create({
      auditId: plan.auditId,
      auditPlanId: plan._id,
      prakalpaId: plan.prakalpaId,
      locationId: plan.locationId,
      auditPlannedDate: plan.auditPlannedDate,
      auditStartDate: req.body.auditStartDate,
      auditEndDate: req.body.auditEndDate,
      auditCoordinator: plan.auditCoordinator,
      finalizedAuditor: req.body.finalizedAuditor || plan.mostProbableAuditor,
      auditPurpose: plan.auditPurpose,
      auditAreas: plan.auditAreas,
      status: "scheduled"
    });

    plan.status = "scheduled";
    await plan.save();

    res.status(201).json(scheduledAudit);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;