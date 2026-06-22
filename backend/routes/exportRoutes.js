const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");

const AuditPlan = require("../models/AuditPlan");
const ScheduledAudit = require("../models/ScheduledAudit");
const Report = require("../models/Report");

function sendExcel(res, rows, sheetName, fileName) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx"
  });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${fileName}`
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.send(buffer);
}

router.get("/audit-plans", async (req, res) => {
  try {
    const auditPlans = await AuditPlan.find()
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    const rows = auditPlans.map((plan) => ({
      Audit_ID: plan.auditId,
      Prakalpa: plan.prakalpaId?.name || "",
      Location: plan.locationId?.name || "",
      Audit_Planned_Date: plan.auditPlannedDate,
      Expected_End_Date: plan.expectedEndDate,
      Audit_Coordinator: plan.auditCoordinator,
      Audit_Purpose: plan.auditPurpose,
      Most_Probable_Auditor: plan.mostProbableAuditor,
      Audit_Areas: plan.auditAreas?.join(", "),
      Status: plan.status,
      Created_At: plan.createdAt
    }));

    sendExcel(res, rows, "Audit Plans", "audit-plans.xlsx");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/scheduled-audits", async (req, res) => {
  try {
    const scheduledAudits = await ScheduledAudit.find()
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    const rows = scheduledAudits.map((audit) => ({
      Audit_ID: audit.auditId,
      Prakalpa: audit.prakalpaId?.name || "",
      Location: audit.locationId?.name || "",
      Audit_Planned_Date: audit.auditPlannedDate,
      Audit_Start_Date: audit.auditStartDate,
      Audit_End_Date: audit.auditEndDate,
      Audit_Coordinator: audit.auditCoordinator,
      Finalized_Auditor: audit.finalizedAuditor,
      Audit_Purpose: audit.auditPurpose,
      Audit_Areas: audit.auditAreas?.join(", "),
      Status: audit.status,
      Created_At: audit.createdAt
    }));

    sendExcel(res, rows, "Scheduled Audits", "scheduled-audits.xlsx");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("prakalpaId")
      .populate("locationId")
      .sort({ createdAt: -1 });

    const rows = reports.map((report) => ({
      Report_ID: report.reportId,
      Audit_ID: report.auditId,
      Prakalpa: report.prakalpaId?.name || "",
      Location: report.locationId?.name || "",
      Internal_Audit_Date: report.internalAuditDate,
      Time_Visited: report.timeVisited,
      Audit_Area: report.auditArea,
      Audit_Findings: report.auditFindings,
      Classification: report.classification,
      Status: report.status,
      Corrective_Action: report.correctiveAction,
      Action_Taken_By_Manager: report.actionTakenByManager,
      Due_Date: report.dueDate,
      Date_Closed: report.dateClosed,
      Proof_URL: report.proofUrl,
      Checklist_URL: report.checklistUrl,
      Created_At: report.createdAt
    }));

    sendExcel(res, rows, "Reports", "reports.xlsx");
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;