import ScheduledAudit from "../models/ScheduledAudit.js";
import AuditPlan from "../models/AuditPlan.js";
import AppError from "../utils/AppError.js";
import { sendMail } from "./emailService.js";

export const getScheduledAudits = async (query = {}) => {
  const filter = {};

  if (query.prakalpa) {
    filter.prakalpa = query.prakalpa;
  }

  if (query.location) {
    filter.location = query.location;
  }

  return await ScheduledAudit.find(filter).sort({
    createdAt: -1,
  });
};

export const getScheduledAuditById = async (id) => {
  const audit = await ScheduledAudit.findById(id);

  if (!audit) {
    throw new AppError(
      "Scheduled audit not found",
      404
    );
  }

  return audit;
};

export const updateScheduledAudit = async (
  id,
  data
) => {
  const audit = await ScheduledAudit.findById(id);

  if (!audit) {
    throw new AppError(
      "Scheduled audit not found",
      404
    );
  }

  /*
   * Completed audits are historical records.
   */
  if (audit.status === "completed") {
    throw new AppError(
      "Completed audits cannot be edited.",
      400
    );
  }

  /*
   * Resolve the final values first.
   */
  const nextStartDate =
    data.startDate !== undefined
      ? new Date(data.startDate)
      : new Date(audit.startDate);

  const nextEndDate =
    data.endDate !== undefined
      ? new Date(data.endDate)
      : new Date(audit.endDate);

  if (
    Number.isNaN(
      nextStartDate.getTime()
    )
  ) {
    throw new AppError(
      "Invalid Start Date.",
      400
    );
  }

  if (
    Number.isNaN(
      nextEndDate.getTime()
    )
  ) {
    throw new AppError(
      "Invalid End Date.",
      400
    );
  }

  if (nextEndDate < nextStartDate) {
    throw new AppError(
      "End Date cannot be before Start Date.",
      400
    );
  }

  const nextCoordinator =
    data.auditCoordinator !== undefined
      ? String(
          data.auditCoordinator
        ).trim()
      : audit.auditCoordinator;

  if (!nextCoordinator) {
    throw new AppError(
      "Audit Coordinator is required.",
      400
    );
  }

  const nextAuditors =
    data.auditors !== undefined
      ? data.auditors
      : audit.auditors;

  if (!Array.isArray(nextAuditors)) {
    throw new AppError(
      "Auditors must be an array.",
      400
    );
  }

  /*
   * The Scheduled Audit edit endpoint is the single
   * backend entry point for scheduled-audit editing.
   *
   * Update the linked AuditPlan master first.
   */
  let auditPlan = null;

  if (audit.auditPlan) {
    auditPlan =
      await AuditPlan.findById(
        audit.auditPlan
      );
  }

  if (!auditPlan) {
    /*
     * Legacy safety fallback. Every normalized
     * ScheduledAudit should have auditPlan, but the
     * IQA number lets us recover an older link.
     */
    auditPlan =
      await AuditPlan.findOne({
        iqaNumber: audit.iqaNumber,
      });
  }

  if (!auditPlan) {
    throw new AppError(
      "Linked Audit Plan not found. Scheduled audit cannot be synchronized.",
      404
    );
  }

  if (auditPlan.status === "completed") {
    throw new AppError(
      "Completed audit plans cannot be edited.",
      400
    );
  }

  /*
   * Keep AuditPlan as the master source for values
   * shared between planning and scheduling.
   *
   * auditPlannedDate tracks the current scheduled
   * start date after scheduling.
   */
  auditPlan.auditPlannedDate =
    nextStartDate;

  auditPlan.auditCoordinator =
    nextCoordinator;

  auditPlan.auditors =
    nextAuditors;

  auditPlan.status = "scheduled";

  await auditPlan.save();

  /*
   * Now synchronize the ScheduledAudit execution
   * record using the same resolved values.
   */
  audit.auditPlan =
    auditPlan._id;

  audit.startDate =
    nextStartDate;

  audit.endDate =
    nextEndDate;

  audit.auditCoordinator =
    nextCoordinator;

  audit.auditors =
    nextAuditors;

  /*
   * Preserve finalAuditor when it is still one of
   * the assigned auditors. Otherwise use the first
   * assigned auditor, or blank if none are assigned.
   */
  if (
    audit.finalAuditor &&
    !nextAuditors.includes(
      audit.finalAuditor
    )
  ) {
    audit.finalAuditor =
      nextAuditors[0] || "";
  }

  if (
    !audit.finalAuditor &&
    nextAuditors.length > 0
  ) {
    audit.finalAuditor =
      nextAuditors[0];
  }

  await audit.save();

  return audit;
};

export const completeScheduledAudit = async (
  id
) => {
  const audit = await ScheduledAudit.findById(id);

  if (!audit) {
    throw new AppError(
      "Scheduled audit not found",
      404
    );
  }

  if (audit.status === "completed") {
    return audit;
  }

  const now = new Date();

  const endDate =
    new Date(
      audit.endDate
    );

  if (
    Number.isNaN(
      endDate.getTime()
    )
  ) {
    throw new AppError(
      "Scheduled audit has an invalid End Date.",
      400
    );
  }

  if (now < endDate) {
    throw new AppError(
      "This audit cannot be marked completed before its End Date.",
      400
    );
  }

  audit.status = "completed";

  await audit.save();

  /*
   * Synchronize parent AuditPlan.
   */
  if (audit.auditPlan) {
    const auditPlan =
      await AuditPlan.findById(
        audit.auditPlan
      );

    if (auditPlan) {
      auditPlan.status =
        "completed";

      await auditPlan.save();
    }
  }

  return audit;
};

export const deleteScheduledAudit = async (
  id
) => {
  const audit =
    await ScheduledAudit.findByIdAndDelete(
      id
    );

  if (!audit) {
    throw new AppError(
      "Scheduled audit not found",
      404
    );
  }

  return audit;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN"
  );
};

export const buildScheduledAuditEmailDraft = (
  audit
) => {
  const startDate =
    formatDate(
      audit.startDate
    );

  const endDate =
    formatDate(
      audit.endDate
    );

  const subject =
    `Upcoming Internal Quality Audit: ${audit.iqaNumber} — ${audit.prakalpa}`;

  const text = [
    "Dear Coordinator / Team,",
    "",
    "This is a notification regarding the upcoming scheduled internal quality audit.",
    "",
    `IQA Reference: ${audit.iqaNumber}`,
    `Prakalpa: ${audit.prakalpa}`,
    `Location: ${audit.location}`,
    `Start Date: ${startDate}`,
    `End Date: ${endDate}`,
    `Audit Coordinator: ${audit.auditCoordinator || "—"}`,
    "",
    "Kindly ensure necessary preparations are in order.",
    "",
    "Regards,",
    "Pratibimba Audit Management System",
  ].join("\n");

  return {
    subject,
    text,
  };
};

const textToHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .split("\n")
    .map((line) =>
      line.trim() === ""
        ? "<br/>"
        : `<p style="margin:0 0 8px">${line}</p>`
    )
    .join("");

export const sendScheduledAuditEmail = async (
  id,
  payload = {}
) => {
  const audit =
    await ScheduledAudit.findById(
      id
    );

  if (!audit) {
    throw new AppError(
      "Scheduled audit not found",
      404
    );
  }

  const {
    to,
    cc,
    subject,
    message,
  } = payload;

  const toList =
    Array.isArray(to)
      ? to.filter(Boolean)
      : to
        ? [to]
        : [];

  const ccList =
    Array.isArray(cc)
      ? cc.filter(Boolean)
      : cc
        ? [cc]
        : [];

  if (toList.length === 0) {
    throw new AppError(
      "Please provide at least one recipient email address.",
      400
    );
  }

  const draft =
    buildScheduledAuditEmailDraft(
      audit
    );

  const finalSubject =
    subject?.trim()
      ? subject.trim()
      : draft.subject;

  const finalText =
    message?.trim()
      ? message
      : draft.text;

  await sendMail({
    to: toList,
    cc: ccList,
    subject: finalSubject,
    text: finalText,
    html: textToHtml(
      finalText
    ),
  });

  audit.mailSent = true;
  audit.mailSentAt =
    new Date();

  await audit.save();

  return audit;
};

export const markMailSent = async (
  id
) => {
  const audit =
    await ScheduledAudit.findById(
      id
    );

  if (!audit) {
    throw new AppError(
      "Scheduled audit not found",
      404
    );
  }

  audit.mailSent = true;
  audit.mailSentAt =
    new Date();

  await audit.save();

  return audit;
};
