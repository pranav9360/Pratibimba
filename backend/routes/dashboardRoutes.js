const express = require("express");
const router = express.Router();

const Prakalpa = require("../models/Prakalpa");
const AuditPlan = require("../models/AuditPlan");
const ScheduledAudit = require("../models/ScheduledAudit");
const Report = require("../models/Report");

router.get("/", async (req, res) => {
  try {
    const assessmentYear = req.query.year || new Date().getFullYear();

    const numberOfPrakalpas = await Prakalpa.countDocuments();

    const prakalpasWithAuditScope = await AuditPlan.distinct("prakalpaId");

    const numberOfAuditsPlanned = await AuditPlan.countDocuments();

    const auditsScheduled = await ScheduledAudit.countDocuments();

    const auditsCompleted = await ScheduledAudit.countDocuments({
      status: "completed"
    });

    const totalReports = await Report.countDocuments();

    const totalNCsReported = await Report.countDocuments({
      classification: "NC"
    });

    const totalOFIReported = await Report.countDocuments({
      classification: "OFI"
    });

    const ncsInOpenStatus = await Report.countDocuments({
      classification: "NC",
      status: "open"
    });

    const ncsClosed = await Report.countDocuments({
      classification: "NC",
      status: "closed"
    });

    const today = new Date();

    const overdueNCs = await Report.countDocuments({
      classification: "NC",
      status: "open",
      dueDate: { $lt: today }
    });

    const closedReports = await Report.countDocuments({
      status: "closed"
    });

    const avgAuditsPerPrakalpa =
      numberOfPrakalpas === 0 ? 0 : numberOfAuditsPlanned / numberOfPrakalpas;

    const iqaCoverage =
      numberOfPrakalpas === 0 ? 0 : (prakalpasWithAuditScope.length / numberOfPrakalpas) * 100;

    const ncClosedPercentage =
      totalNCsReported === 0 ? 0 : (ncsClosed / totalNCsReported) * 100;

    const overdueNCsPercentage =
      totalNCsReported === 0 ? 0 : (overdueNCs / totalNCsReported) * 100;

    const closureRate =
      totalReports === 0 ? 0 : (closedReports / totalReports) * 100;

    res.json({
      assessmentYear,
      numberOfPrakalpas,
      numberOfPrakalpasWithAuditScope: prakalpasWithAuditScope.length,
      iqaCoverage: Number(iqaCoverage.toFixed(2)),
      numberOfAuditsPlanned,
      avgAuditsPerPrakalpa: Number(avgAuditsPerPrakalpa.toFixed(2)),
      auditsScheduled,
      auditsCompleted,
      totalReports,
      totalNCsReported,
      totalOFIReported,
      ncsInOpenStatus,
      ncsClosed,
      ncClosedPercentage: Number(ncClosedPercentage.toFixed(2)),
      overdueNCs,
      overdueNCsPercentage: Number(overdueNCsPercentage.toFixed(2)),
      closureRate: Number(closureRate.toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;