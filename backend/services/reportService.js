import PDFDocument from "pdfkit";
import Report from "../models/Report.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import AuditPlan from "../models/AuditPlan.js";
import AppError from "../utils/AppError.js";
import { sendMail } from "./emailService.js";

export const createReport = async (data) => {
  const audit = await ScheduledAudit.findById(data.scheduledAudit);

  if (!audit) {
    throw new AppError("Scheduled Audit not found", 404);
  }

  // Validate top-level observations array
  if (!Array.isArray(data.observations) || data.observations.length === 0) {
    throw new AppError("At least one observation is required.", 400);
  }

  const currentYear = new Date().getFullYear();

  const reports = await Report.find(
    {
      iqrNumber: new RegExp(`^IQR-${currentYear}-`),
    },
    "iqrNumber"
  );

  let maxNumber = 0;

  for (const report of reports) {
    const match = report.iqrNumber.match(
      new RegExp(`^IQR-${currentYear}-(\\d{4})$`)
    );

    if (!match) continue;

    const number = parseInt(match[1], 10);

    if (number > maxNumber) {
      maxNumber = number;
    }
  }

  const nextNumber = maxNumber + 1;
  let runningNumber = nextNumber;

  const createdReports = [];

  for (const observation of data.observations) {
    // Validate each observation item
    if (!observation.findings || !observation.severity) {
      throw new AppError(
        "Each observation must contain findings and classification.",
        400
      );
    }

    const iqrNumber = `IQR-${currentYear}-${String(runningNumber).padStart(
      4,
      "0"
    )}`;

    runningNumber++;

    const report = await Report.create({
      iqrNumber,
      auditPlan: audit.auditPlan,
      scheduledAudit: audit._id,
      iqaNumber: audit.iqaNumber,

      prakalpa: audit.prakalpa,
      location: audit.location,
      sublocation: audit.sublocation,
      auditCoordinator: audit.auditCoordinator,

      auditors: audit.auditors,

      // =========================
      // Audit Metadata
      // =========================

      auditAreas: audit.auditAreas || [],
      purpose: audit.purpose || "",
      prakalphaPramukh: audit.prakalphaPramukh || "",

      visitDate: data.visitDate,
      visitTime: data.visitTime,

      severity: observation.severity,
      findings: observation.findings,

      proofFiles: Array.isArray(observation.proofFiles)
        ? observation.proofFiles
        : [],

      hasChecklist: data.hasChecklist || false,

      // =========================
      // Report Lifecycle
      // =========================

      status: "open",
      reportCreatedOn: new Date(),
    });

    createdReports.push(report);
  }

  // IMPORTANT:
  // Do NOT delete the ScheduledAudit or AuditPlan here.
  // They are historical lifecycle records for this IQA number.
  //
  // The audit remains traceable as:
  //
  // AuditPlan -> ScheduledAudit -> Report(s)
  //
  // Mark the lifecycle as completed instead.

  audit.status = "completed";
  await audit.save();

  await AuditPlan.findByIdAndUpdate(audit.auditPlan, {
    status: "completed",
  });

  return createdReports;
};

export const getReports = async () => {
  return await Report.find().sort({
    createdAt: -1,
  });
};

export const getReportById = async (id) => {
  const report = await Report.findById(id);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  return report;
};

// Builds the PDF content onto a fresh PDFDocument but does NOT call
// doc.end() — callers decide how to consume the stream (pipe straight
// to an HTTP response for download, or collect it into a Buffer for
// an email attachment).
const buildReportDocument = (report) => {
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
  });

  doc.info.Title = `Audit Report - ${report.iqrNumber}`;
  doc.info.Author = "Pratibimba Audit Management System";

  doc.fontSize(20)
    .font("Helvetica-Bold")
    .text("PRATIBIMBA AUDIT REPORT", {
      align: "center",
    });

  doc.moveDown(0.5);

  doc.fontSize(13)
    .font("Helvetica-Bold")
    .text(report.iqrNumber, {
      align: "center",
    });

  doc.moveDown(1.5);

  const addField = (label, value) => {
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(`${label}: `, {
        continued: true,
      })
      .font("Helvetica")
      .text(value || "—");

    doc.moveDown(0.35);
  };

  addField("IQA Number", report.iqaNumber);
  addField("Prakalpa", report.prakalpa);
  addField("Location", report.location);
  addField("Sublocation", report.sublocation);
  addField("Prakalpa", report.prakalpa);
  addField("Audit Coordinator", report.auditCoordinator);
  addField(
    "Auditors",
    Array.isArray(report.auditors)
      ? report.auditors.join(", ")
      : ""
  );
  addField(
    "Prakalpha Pramukh",
    report.prakalphaPramukh
  );
  addField(
    "Audit Areas",
    Array.isArray(report.auditAreas)
      ? report.auditAreas.join(", ")
      : ""
  );
  addField("Purpose", report.purpose);
  addField(
    "Visit Date",
    report.visitDate
      ? new Date(report.visitDate).toLocaleDateString()
      : ""
  );
  addField("Visit Time", report.visitTime);
  addField("Status", report.status);
  addField(
    "Report Created",
    report.reportCreatedOn
      ? new Date(report.reportCreatedOn).toLocaleString()
      : ""
  );

  doc.moveDown(1);

  doc
    .fontSize(13)
    .font("Helvetica-Bold")
    .text("Finding");

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(report.findings || "—", {
      lineGap: 4,
    });

  doc.moveDown(1);

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Classification");

  doc.moveDown(0.35);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(
      report.severity === "non_conformance"
        ? "Non-Conformance"
        : "Open for Improvement"
    );

  if (report.actionTaken) {
    doc.moveDown(1);

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Action Taken");

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(report.actionTaken, {
        lineGap: 4,
      });
  }

  if (report.completionRemarks) {
    doc.moveDown(1);

    doc
      .fontSize(13)
      .font("Helvetica-Bold")
      .text("Completion Remarks");

    doc.moveDown(0.5);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(report.completionRemarks, {
        lineGap: 4,
      });
  }

  if (report.closedBy || report.closedAt) {
    doc.moveDown(1);

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Closure");

    doc.moveDown(0.35);

    addField("Closed By", report.closedBy);
    addField(
      "Closed At",
      report.closedAt
        ? new Date(report.closedAt).toLocaleString()
        : ""
    );
  }

  doc.moveDown(1.5);

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor("#666666")
    .text(
      "Generated by Pratibimba Audit Management System",
      {
        align: "center",
      }
    );

  return doc;
};

// Streams the PDF for direct browser download (unchanged behaviour).
export const generateReportPDF = async (id) => {
  const report = await Report.findById(id);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  const doc = buildReportDocument(report);

  doc.end();

  return doc;
};

// Builds the same PDF but resolves to a Buffer instead of streaming it,
// so it can be attached to an outgoing email.
export const generateReportPDFBuffer = async (id) => {
  const report = await Report.findById(id);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  const doc = buildReportDocument(report);

  const buffer = await new Promise((resolve, reject) => {
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.end();
  });

  return { report, buffer };
};

// ===================================
// Draft email content
// ===================================

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const buildReportEmailDraft = (report) => {
  const classification =
    report.severity === "non_conformance"
      ? "Non-Conformance"
      : "Open for Improvement";

  const visitDate = report.visitDate
    ? new Date(report.visitDate).toLocaleDateString("en-IN")
    : "—";

  const auditors = Array.isArray(report.auditors)
    ? report.auditors.join(", ")
    : "—";

  const subject = `Audit Report ${report.iqrNumber} — ${report.prakalpa}, ${report.location}`;

  const text = [
    "Dear Sir/Madam,",
    "",
    "Please find attached the Internal Quality Audit report for your reference.",
    "",
    `IQR Number: ${report.iqrNumber}`,
    `IQA Reference: ${report.iqaNumber}`,
    `Prakalpa: ${report.prakalpa}`,
    `Location: ${report.location}${report.sublocation ? ` (${report.sublocation})` : ""}`,
    `Audit Coordinator: ${report.auditCoordinator || "—"}`,
    `Auditor(s): ${auditors}`,
    `Visit Date: ${visitDate}`,
    `Classification: ${classification}`,
    "",
    "Finding:",
    report.findings || "—",
    "",
    "Kindly review the attached report and take necessary action within the stipulated timeline.",
    "",
    "Regards,",
    "Pratibimba Audit Management System",
  ].join("\n");

  return { subject, text };
};

const textToHtml = (text) =>
  escapeHtml(text)
    .split("\n")
    .map((line) => (line.trim() === "" ? "<br/>" : `<p style="margin:0 0 8px">${line}</p>`))
    .join("");

// ===================================
// Send Report Email
// ===================================

export const sendReportEmail = async (id, payload = {}) => {
  const { report, buffer } = await generateReportPDFBuffer(id);

  const { to, cc, subject, message } = payload;

  const toList = Array.isArray(to) ? to.filter(Boolean) : (to ? [to] : []);
  const ccList = Array.isArray(cc) ? cc.filter(Boolean) : (cc ? [cc] : []);

  if (toList.length === 0) {
    throw new AppError("Please provide at least one recipient email address.", 400);
  }

  const draft = buildReportEmailDraft(report);

  const finalSubject = subject && subject.trim() ? subject.trim() : draft.subject;
  const finalText = message && message.trim() ? message : draft.text;

  await sendMail({
    to: toList,
    cc: ccList,
    subject: finalSubject,
    text: finalText,
    html: textToHtml(finalText),
    attachments: [
      {
        filename: `${report.iqrNumber}.pdf`,
        content: buffer,
        contentType: "application/pdf",
      },
    ],
  });

  report.mailSent = true;
  report.mailSentAt = new Date();
  report.mailSentTo = toList;

  await report.save();

  return report;
};

// ===================================
// Close Report
// ===================================

export const closeReport = async (id, data, currentUser) => {
  const report = await Report.findById(id);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  report.status = "closed";
  report.actionTaken = data.actionTaken;
  report.completionRemarks = data.completionRemarks;

  report.closedBy =
    currentUser?.name || currentUser?.email || "Unknown User";

  const closedTime = new Date();

  report.closedAt = closedTime;
  report.reportClosedOn = closedTime;

  if (data.proofFiles && Array.isArray(data.proofFiles)) {
    report.proofFiles = data.proofFiles;
  }

  await report.save();

  return report;
};

// ===================================
// Update Report
// ===================================

export const updateReport = async (id, data) => {
  const report = await Report.findById(id);

  if (!report) {
    throw new AppError("Report not found", 404);
  }

  // Editable fields
  report.findings = data.findings;
  report.severity = data.severity;
  report.actionTaken = data.actionTaken || "";
  report.completionRemarks = data.completionRemarks || "";

  // --------------------
  // Reopen Report
  // --------------------

  if (report.status === "closed" && data.status === "open") {
    report.status = "open";
    report.actionTaken = "";
    report.completionRemarks = "";
    report.closedBy = "";
    report.closedAt = null;
    report.reportClosedOn = null;
  }

  await report.save();

  return report;
};