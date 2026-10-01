import PDFDocument from "pdfkit";
import Report from "../models/Report.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import AuditPlan from "../models/AuditPlan.js";
import AppError from "../utils/AppError.js";
import { sendMail } from "./emailService.js";

const assertCanManageScheduledAuditReports = (
  audit,
  currentUser
) => {
  if (!currentUser) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  const role = String(
    currentUser.role || ""
  ).trim();

  const userName = String(
    currentUser.name || ""
  ).trim();

  /*
   * Application administrators retain global operational access.
   */
  if (
    role === "super_admin" ||
    role === "admin"
  ) {
    return;
  }

  /*
   * The Audit Coordinator owns official report generation,
   * editing, sending and completion for their assigned audit.
   */
  if (
    role === "audit_coordinator" &&
    userName &&
    String(
      audit.auditCoordinator || ""
    ).trim() === userName
  ) {
    return;
  }

  throw new AppError(
    "You are not authorized to manage reports for this audit.",
    403
  );
};


const getManageableReport = async (
  id,
  currentUser
) => {
  const report = await Report.findById(id);

  if (!report) {
    throw new AppError(
      "Report not found",
      404
    );
  }

  const audit =
    await ScheduledAudit.findById(
      report.scheduledAudit
    );

  if (!audit) {
    throw new AppError(
      "The Scheduled Audit linked to this report was not found.",
      409
    );
  }

  assertCanManageScheduledAuditReports(
    audit,
    currentUser
  );

  return {
    report,
    audit,
  };
};


export const createReport = async (
  data,
  currentUser
) => {
  const audit = await ScheduledAudit.findById(data.scheduledAudit);

  if (!audit) {
    throw new AppError("Scheduled Audit not found", 404);
  }

  assertCanManageScheduledAuditReports(
    audit,
    currentUser
  );

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

/*
 * ==========================================================
 * REPORT JURISDICTION
 * ==========================================================
 *
 * ScheduledAudit is the authoritative assignment source.
 *
 * Never grant access merely because a Report document contains
 * a matching name/prakalpa copied into historical metadata.
 *
 * Roles:
 *
 * super_admin / admin
 *   -> all reports
 *
 * audit_coordinator
 *   -> reports belonging to ScheduledAudits where the user is
 *      the assigned Audit Coordinator
 *
 * lead_auditor
 *   -> reports belonging to ScheduledAudits where the user is
 *      the assigned Lead Auditor
 *
 * auditor
 *   -> reports belonging to ScheduledAudits where the user is
 *      present in auditors[]
 *
 * prakalpa_manager
 *   -> reports belonging to ScheduledAudits for the user's
 *      configured Prakalpa
 */

const normalizeIdentity = (value) =>
  String(value || "").trim();


const getScheduledAuditIdsForUser = async (
  currentUser
) => {
  if (!currentUser) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  const role = normalizeIdentity(
    currentUser.role
  );

  const userName = normalizeIdentity(
    currentUser.name
  );

  /*
   * Admin roles have application-wide report visibility.
   */
  if (
    role === "super_admin" ||
    role === "admin"
  ) {
    return null;
  }


  /*
   * Current assignment fields in ScheduledAudit are stored
   * as names, therefore name is the canonical lookup value
   * for coordinator / lead / auditor jurisdiction.
   */
  if (
    role === "audit_coordinator" ||
    role === "lead_auditor" ||
    role === "auditor"
  ) {
    if (!userName) {
      throw new AppError(
        "Your user account does not have a valid name for audit assignment.",
        403
      );
    }
  }


  let auditFilter;


  switch (role) {
    case "audit_coordinator":
      auditFilter = {
        auditCoordinator: userName,
      };
      break;


    case "lead_auditor":
      auditFilter = {
        leadAuditor: userName,
      };
      break;


    case "auditor":
      auditFilter = {
        auditors: userName,
      };
      break;


    case "prakalpa_manager": {
      const prakalpa =
        normalizeIdentity(
          currentUser.prakalpa
        );

      if (!prakalpa) {
        throw new AppError(
          "No Prakalpa is assigned to this Prakalpa Manager.",
          403
        );
      }

      auditFilter = {
        prakalpa,
      };

      break;
    }


    default:
      throw new AppError(
        "Your role does not have report access.",
        403
      );
  }


  const audits =
    await ScheduledAudit.find(
      auditFilter,
      "_id"
    ).lean();


  return audits.map(
    (audit) => audit._id
  );
};


/*
 * Build the Mongo Report filter for the authenticated user.
 */
export const buildReportJurisdiction = async (
  currentUser
) => {
  const auditIds =
    await getScheduledAuditIdsForUser(
      currentUser
    );


  /*
   * null means unrestricted application-wide visibility.
   */
  if (auditIds === null) {
    return {};
  }


  /*
   * An empty $in array intentionally returns zero reports.
   * Never fall back to Report.find() here.
   */
  return {
    scheduledAudit: {
      $in: auditIds,
    },
  };
};


/*
 * Return only reports inside the authenticated user's
 * jurisdiction.
 */
export const getReports = async (
  currentUser
) => {
  const filter =
    await buildReportJurisdiction(
      currentUser
    );

  return await Report.find(filter).sort({
    createdAt: -1,
  });
};


/*
 * Fetch one report while enforcing the SAME jurisdiction
 * used by the list endpoint.
 *
 * Returning 404 rather than revealing that an inaccessible
 * report exists prevents cross-jurisdiction enumeration.
 */
export const getReportById = async (
  id,
  currentUser
) => {
  const filter =
    await buildReportJurisdiction(
      currentUser
    );

  const report =
    await Report.findOne({
      _id: id,
      ...filter,
    });


  if (!report) {
    throw new AppError(
      "Report not found",
      404
    );
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
export const generateReportPDF = async (
  id,
  currentUser
) => {
  const report = await getReportById(
    id,
    currentUser
  );

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

export const sendReportEmail = async (
  id,
  payload = {},
  currentUser
) => {
  const {
    report: authorizedReport,
  } = await getManageableReport(
    id,
    currentUser
  );

  const {
    report,
    buffer,
  } = await generateReportPDFBuffer(
    authorizedReport._id
  );

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
// Send ALL IQR PDFs for one IQA
// ===================================

export const sendIQAReportsEmail = async (
  iqaNumber,
  payload = {},
  currentUser
) => {
  if (!iqaNumber || !String(iqaNumber).trim()) {
    throw new AppError("IQA number is required.", 400);
  }

  const normalizedIqaNumber =
    String(iqaNumber).trim();

  const {
    to,
    cc,
    subject,
    message,
    reportIds,
  } = payload;

  // Open Reports is the source of the exact IQR selection.
  // Never rediscover every historical report from iqaNumber alone.
  if (!Array.isArray(reportIds) || reportIds.length === 0) {
    throw new AppError(
      "No IQR reports were selected for this IQA email.",
      400
    );
  }

  // Remove accidental duplicate IDs before querying.
  const uniqueReportIds = [
    ...new Set(
      reportIds
        .map((id) => String(id).trim())
        .filter(Boolean)
    ),
  ];

  if (uniqueReportIds.length === 0) {
    throw new AppError(
      "No valid IQR report IDs were supplied.",
      400
    );
  }

  // Security / integrity rule:
  // every supplied report must ALSO belong to the requested IQA.
  const reports = await Report.find({
    _id: {
      $in: uniqueReportIds,
    },
    iqaNumber: normalizedIqaNumber,
    status: "open",
  }).sort({
    createdAt: 1,
    iqrNumber: 1,
  });

  // If the counts differ, at least one supplied ID was invalid,
  // missing, or belonged to another IQA. Abort instead of silently
  // sending an incomplete/wrong email.
  if (reports.length !== uniqueReportIds.length) {
    throw new AppError(
      "One or more selected IQR reports are invalid or do not belong to this IQA.",
      409
    );
  }

  /*
   * Authorization is checked against the authoritative
   * ScheduledAudit belonging to every exact report selected.
   *
   * Do NOT broaden this back to an iqaNumber-only query.
   */
  const scheduledAuditIds = [
    ...new Set(
      reports
        .map((report) =>
          String(
            report.scheduledAudit || ""
          ).trim()
        )
        .filter(Boolean)
    ),
  ];

  if (scheduledAuditIds.length === 0) {
    throw new AppError(
      "Selected reports are not linked to a Scheduled Audit.",
      409
    );
  }

  const scheduledAudits =
    await ScheduledAudit.find({
      _id: {
        $in: scheduledAuditIds,
      },
    });

  if (
    scheduledAudits.length !==
    scheduledAuditIds.length
  ) {
    throw new AppError(
      "One or more selected reports have an invalid Scheduled Audit.",
      409
    );
  }

  for (const audit of scheduledAudits) {
    assertCanManageScheduledAuditReports(
      audit,
      currentUser
    );
  }

  const toList =
    Array.isArray(to)
      ? to.map((v) => String(v).trim()).filter(Boolean)
      : to
        ? [String(to).trim()]
        : [];

  const ccList =
    Array.isArray(cc)
      ? cc.map((v) => String(v).trim()).filter(Boolean)
      : cc
        ? [String(cc).trim()]
        : [];

  if (toList.length === 0) {
    throw new AppError(
      "Please provide at least one recipient email address.",
      400
    );
  }

  // Generate the official PDF for every IQR under this IQA.
  // We deliberately reuse generateReportPDFBuffer so emailed
  // PDFs are identical to the PDFs downloaded from Reports.
  const attachments = [];

  for (const report of reports) {
    const {
      report: generatedReport,
      buffer,
    } = await generateReportPDFBuffer(
      report._id
    );

    // Safety guard: never attach a report from another IQA.
    if (
      generatedReport.iqaNumber !==
      normalizedIqaNumber
    ) {
      throw new AppError(
        `Report ${generatedReport.iqrNumber} does not belong to ${normalizedIqaNumber}.`,
        409
      );
    }

    attachments.push({
      filename: `${generatedReport.iqrNumber}.pdf`,
      content: buffer,
      contentType: "application/pdf",
    });
  }

  const firstReport = reports[0];

  const defaultSubject =
    `Internal Quality Audit Reports — ${normalizedIqaNumber}`;

  const defaultText = [
    "Dear Sir/Madam,",
    "",
    `Please find attached all Internal Quality Audit reports under ${normalizedIqaNumber}.`,
    "",
    `Prakalpa: ${firstReport.prakalpa || "—"}`,
    `Location: ${firstReport.location || "—"}`,
    "",
    "Attached IQRs:",
    ...reports.map(
      (report) => `- ${report.iqrNumber}`
    ),
    "",
    "Kindly review the attached reports and take necessary action.",
    "",
    "Regards,",
    "Pratibimba Audit Management System",
  ].join("\n");

  const finalSubject =
    subject && subject.trim()
      ? subject.trim()
      : defaultSubject;

  const finalText =
    message && message.trim()
      ? message
      : defaultText;

  await sendMail({
    to: toList,
    cc: ccList,
    subject: finalSubject,
    text: finalText,
    html: textToHtml(finalText),
    attachments,
  });

  // Email state belongs to the reports that were actually sent.
  const sentAt = new Date();

  await Report.updateMany(
    {
      _id: {
        $in: reports.map(
          (report) => report._id
        ),
      },
    },
    {
      $set: {
        mailSent: true,
        mailSentAt: sentAt,
        mailSentTo: toList,
      },
    }
  );

  return {
    iqaNumber: normalizedIqaNumber,
    reportCount: reports.length,
    iqrNumbers: reports.map(
      (report) => report.iqrNumber
    ),
    mailSent: true,
    mailSentAt: sentAt,
    mailSentTo: toList,
  };
};


// ===================================
// Official IQR → Prakalpa workflow
// ===================================

/*
 * Audit Coordinator formally releases an already-generated
 * official IQR to the Prakalpa.
 *
 * Generic report-management authorization remains unchanged.
 * This action therefore uses getManageableReport(), whose
 * ScheduledAudit-based authorization is authoritative.
 */

/*
 * Append an immutable business-workflow event to a Report.
 *
 * workflowStatus stores the current state.
 * workflowHistory preserves how the report reached that state.
 */
const appendReportWorkflowHistory = (
  report,
  {
    action,
    fromStatus = "",
    toStatus = "",
    currentUser,
    remarks = "",
    performedAt = new Date(),
  }
) => {
  if (!Array.isArray(report.workflowHistory)) {
    report.workflowHistory = [];
  }

  report.workflowHistory.push({
    action,
    fromStatus,
    toStatus,
    performedBy:
      normalizeIdentity(currentUser?.name) ||
      normalizeIdentity(currentUser?.email),
    role:
      normalizeIdentity(currentUser?.role),
    remarks:
      normalizeIdentity(remarks),
    performedAt,
  });
};


export const sendReportToPrakalpa = async (
  id,
  currentUser
) => {
  const {
    report,
    audit,
  } = await getManageableReport(
    id,
    currentUser
  );

  /*
   * Workflow authority is intentionally stricter than generic
   * administrative report access.
   *
   * Only the Audit Coordinator assigned to the Scheduled Audit
   * may formally release the official IQR to the Prakalpa.
   */
  const role =
    normalizeIdentity(
      currentUser.role
    );

  const userName =
    normalizeIdentity(
      currentUser.name
    );

  const assignedCoordinator =
    normalizeIdentity(
      audit.auditCoordinator
    );

  if (
    role !== "audit_coordinator" ||
    !userName ||
    !assignedCoordinator ||
    userName !== assignedCoordinator
  ) {
    throw new AppError(
      "Only the assigned Audit Coordinator can send this IQR to the Prakalpa.",
      403
    );
  }

  /*
   * Only the coordinator-generated stage can enter the
   * Prakalpa corrective-action workflow.
   */
  if (
    report.workflowStatus !==
    "coordinator_generated"
  ) {
    throw new AppError(
      "Only a coordinator-generated IQR can be sent to the Prakalpa.",
      409
    );
  }

  const fromStatus =
    report.workflowStatus;

  const now =
    new Date();

  report.workflowStatus =
    "sent_to_prakalpa";

  report.sentToPrakalpaAt =
    now;

  appendReportWorkflowHistory(
    report,
    {
      action:
        "sent_to_prakalpa",
      fromStatus,
      toStatus:
        "sent_to_prakalpa",
      currentUser,
      performedAt:
        now,
    }
  );

  await report.save();

  return report;
};


/*
 * Fetch a report specifically for a Prakalpa Manager action.
 *
 * This helper intentionally DOES NOT use getManageableReport().
 * Prakalpa Managers must never receive generic report mutation
 * authority.
 *
 * Jurisdiction is derived from ScheduledAudit + authenticated
 * user's configured Prakalpa.
 */
const getPrakalpaActionReport = async (
  id,
  currentUser
) => {
  if (!currentUser) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  if (
    normalizeIdentity(
      currentUser.role
    ) !== "prakalpa_manager"
  ) {
    throw new AppError(
      "Only a Prakalpa Manager can submit corrective action.",
      403
    );
  }

  const report =
    await Report.findById(id);

  if (!report) {
    throw new AppError(
      "Report not found",
      404
    );
  }

  const audit =
    await ScheduledAudit.findById(
      report.scheduledAudit
    );

  if (!audit) {
    throw new AppError(
      "The Scheduled Audit linked to this report was not found.",
      409
    );
  }

  const userPrakalpa =
    normalizeIdentity(
      currentUser.prakalpa
    );

  const auditPrakalpa =
    normalizeIdentity(
      audit.prakalpa
    );

  if (
    !userPrakalpa ||
    !auditPrakalpa ||
    userPrakalpa !== auditPrakalpa
  ) {
    /*
     * Use 404 so cross-Prakalpa report existence is not exposed.
     */
    throw new AppError(
      "Report not found",
      404
    );
  }

  return {
    report,
    audit,
  };
};


/*
 * Prakalpa Manager submits corrective action against an IQR
 * that has formally been released to their Prakalpa.
 */
export const submitPrakalpaCorrectiveAction = async (
  id,
  data = {},
  currentUser
) => {
  const {
    report,
  } = await getPrakalpaActionReport(
    id,
    currentUser
  );

  /*
   * A returned action may also be corrected and resubmitted.
   */
  if (
    report.workflowStatus !==
      "sent_to_prakalpa" &&
    report.workflowStatus !==
      "returned_to_prakalpa"
  ) {
    throw new AppError(
      "Corrective action can only be submitted for an IQR awaiting Prakalpa action.",
      409
    );
  }

  const actionTaken =
    normalizeIdentity(
      data.actionTaken
    );

  if (!actionTaken) {
    throw new AppError(
      "Corrective action is required.",
      400
    );
  }

  const completionRemarks =
    normalizeIdentity(
      data.completionRemarks
    );

  report.actionTaken =
    actionTaken;

  report.completionRemarks =
    completionRemarks;

  /*
   * Corrective-action evidence may be supplied, but only as an
   * array. Existing evidence is left unchanged when omitted.
   */
  if (
    data.proofFiles !== undefined
  ) {
    if (
      !Array.isArray(
        data.proofFiles
      )
    ) {
      throw new AppError(
        "proofFiles must be an array.",
        400
      );
    }

    report.proofFiles =
      data.proofFiles;
  }

  const fromStatus =
    report.workflowStatus;

  const now =
    new Date();

  report.workflowStatus =
    "action_submitted";

  report.actionSubmittedBy =
    normalizeIdentity(
      currentUser.name
    ) ||
    normalizeIdentity(
      currentUser.email
    );

  report.actionSubmittedAt =
    now;

  appendReportWorkflowHistory(
    report,
    {
      action:
        "action_submitted",
      fromStatus,
      toStatus:
        "action_submitted",
      currentUser,
      remarks:
        completionRemarks,
      performedAt:
        now,
    }
  );

  await report.save();

  return report;
};


// ===================================
// Close Report


// ===================================
// Update Report
// ===================================

export const updateReport = async (
  id,
  data,
  currentUser
) => {
  const {
    report,
  } = await getManageableReport(
    id,
    currentUser
  );

  /*
   * Generic report editing is intentionally limited to the
   * report's descriptive audit fields.
   *
   * Corrective-action and lifecycle fields are controlled only
   * by the formal workflow endpoints:
   *
   *   submit-action
   *   return-to-prakalpa
   *   verify-close
   *
   * Generic editing must therefore never modify:
   *   actionTaken
   *   completionRemarks
   *   proofFiles
   *   workflowStatus
   *   status
   *   closedBy / closedAt / reportClosedOn
   *   verification metadata
   */

  if (data.findings !== undefined) {
    report.findings = data.findings;
  }

  if (data.severity !== undefined) {
    report.severity = data.severity;
  }

  await report.save();

  return report;
};

// ============================================================
// Coordinator corrective-action verification
// ============================================================

const getCoordinatorVerificationReport = async (
  id,
  currentUser
) => {
  const {
    report,
    audit,
  } = await getManageableReport(
    id,
    currentUser
  );

  const role =
    normalizeIdentity(
      currentUser?.role
    );

  const userName =
    normalizeIdentity(
      currentUser?.name
    );

  const assignedCoordinator =
    normalizeIdentity(
      audit?.auditCoordinator
    );

  /*
   * Workflow authority comes from ScheduledAudit.
   *
   * Administrative/global report visibility must NOT grant
   * authority to verify or return corrective actions.
   */
  if (
    role !== "audit_coordinator" ||
    !userName ||
    !assignedCoordinator ||
    userName !== assignedCoordinator
  ) {
    throw new AppError(
      "Only the assigned Audit Coordinator can verify this corrective action.",
      403
    );
  }

  return {
    report,
    audit,
  };
};


// ------------------------------------------------------------
// Return corrective action to Prakalpa
// ------------------------------------------------------------

export const returnReportToPrakalpa = async (
  id,
  data,
  currentUser
) => {
  const {
    report,
  } = await getCoordinatorVerificationReport(
    id,
    currentUser
  );

  if (
    report.workflowStatus !==
    "action_submitted"
  ) {
    throw new AppError(
      "Only a submitted corrective action can be returned to the Prakalpa.",
      409
    );
  }

  const remarks =
    normalizeIdentity(
      data?.remarks ??
      data?.coordinatorVerificationRemarks
    );

  if (!remarks) {
    throw new AppError(
      "Return remarks are required.",
      400
    );
  }

  const fromStatus =
    report.workflowStatus;

  const now =
    new Date();

  report.coordinatorVerificationRemarks =
    remarks;

  report.workflowStatus =
    "returned_to_prakalpa";

  /*
   * This is not a verification/closure, therefore verifiedBy
   * and verifiedAt must remain empty.
   */
  report.verifiedBy = "";
  report.verifiedAt = null;

  appendReportWorkflowHistory(
    report,
    {
      action:
        "returned_to_prakalpa",
      fromStatus,
      toStatus:
        "returned_to_prakalpa",
      currentUser,
      remarks,
      performedAt:
        now,
    }
  );

  await report.save();

  return report;
};


// ------------------------------------------------------------
// Verify corrective action and formally close IQR
// ------------------------------------------------------------

export const verifyAndCloseReport = async (
  id,
  data,
  currentUser
) => {
  const {
    report,
  } = await getCoordinatorVerificationReport(
    id,
    currentUser
  );

  if (
    report.workflowStatus !==
    "action_submitted"
  ) {
    throw new AppError(
      "Only a submitted corrective action can be verified and closed.",
      409
    );
  }

  const remarks =
    normalizeIdentity(
      data?.remarks ??
      data?.coordinatorVerificationRemarks
    );

  const verifier =
    normalizeIdentity(
      currentUser.name
    ) ||
    normalizeIdentity(
      currentUser.email
    );

  const now =
    new Date();

  report.coordinatorVerificationRemarks =
    remarks;

  report.verifiedBy =
    verifier;

  report.verifiedAt =
    now;

  report.workflowStatus =
    "verified_closed";

  /*
   * Preserve compatibility with the existing report lifecycle.
   */
  report.status =
    "closed";

  report.closedBy =
    verifier;

  report.closedAt =
    now;

  report.reportClosedOn =
    now;

  appendReportWorkflowHistory(
    report,
    {
      action:
        "verified_closed",
      fromStatus:
        "action_submitted",
      toStatus:
        "verified_closed",
      currentUser,
      remarks,
      performedAt:
        now,
    }
  );

  await report.save();

  return report;
};
