const express = require("express");
const router = express.Router();

const AuditPlan = require("../models/AuditPlan");
const ScheduledAudit = require("../models/ScheduledAudit");
const Report = require("../models/Report");

router.get("/", async (req, res) => {
  try {
    const filters = {};

    if (req.query.auditId) {
      filters.auditId = req.query.auditId;
    }

    const auditPlans = await AuditPlan.find(filters)
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    const summary = await Promise.all(
      auditPlans.map(async (plan) => {
        const scheduledAudits = await ScheduledAudit.find({
          auditId: plan.auditId
        });

        const reports = await Report.find({
          auditId: plan.auditId
        });

        const ncReports = reports.filter((report) => report.classification === "NC");
        const ofiReports = reports.filter((report) => report.classification === "OFI");

        const firstScheduledAudit = scheduledAudits[0];

        let auditDays = null;

        if (firstScheduledAudit?.auditStartDate && firstScheduledAudit?.auditEndDate) {
          const start = new Date(firstScheduledAudit.auditStartDate);
          const end = new Date(firstScheduledAudit.auditEndDate);
          auditDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        }

        return {
          auditId: plan.auditId,
          prakalpa: plan.prakalpaId?.name || "",
          location: plan.locationId?.name || "",
          auditPlannedDate: plan.auditPlannedDate,
          auditCoordinator: plan.auditCoordinator,
          auditStartDate: firstScheduledAudit?.auditStartDate || null,
          auditEndDate: firstScheduledAudit?.auditEndDate || null,
          auditDays,
          auditors: firstScheduledAudit?.finalizedAuditor || plan.mostProbableAuditor || "",
          auditAreas: plan.auditAreas,
          totalAuditFindings: reports.length,
          classification: {
            NC: ncReports.length,
            OFI: ofiReports.length
          },
          status: firstScheduledAudit?.status || plan.status,
          prakalpaPramukh: plan.prakalpaId?.prakalpaPramukh || "",
          ncIARs: ncReports.map((report) => report.reportId),
          ofiIARs: ofiReports.map((report) => report.reportId)
        };
      })
    );

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:auditId", async (req, res) => {
  try {
    const plan = await AuditPlan.findOne({
      auditId: req.params.auditId
    })
      .populate("prakalpaId")
      .populate("locationId");

    if (!plan) {
      return res.status(404).json({ message: "Audit not found" });
    }

    const scheduledAudits = await ScheduledAudit.find({
      auditId: req.params.auditId
    });

    const reports = await Report.find({
      auditId: req.params.auditId
    });

    res.json({
      auditPlan: plan,
      scheduledAudits,
      reports
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;