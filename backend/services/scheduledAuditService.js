import ScheduledAudit from "../models/ScheduledAudit.js";
import User from "../models/User.js";
import AuditPlan from "../models/AuditPlan.js";
import AppError from "../utils/AppError.js";
import { sendMail } from "./emailService.js";
/*
 * ============================================================
 * Scheduled Audit read jurisdiction
 * ============================================================
 *
 * Authorization is enforced here in the backend.
 * Frontend filtering is presentation only.
 *
 * Current assignment fields store User.name strings, so the
 * authenticated MongoDB user's name is used for matching.
 */

const normalizeUserValue = (value) =>
  String(value || "").trim();

const getScheduledAuditJurisdiction = (user) => {
  if (!user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  const role = normalizeUserValue(user.role);
  const name = normalizeUserValue(user.name);

  // Administrative oversight
  if (
    role === "super_admin" ||
    role === "admin"
  ) {
    return {};
  }

  if (!name) {
    throw new AppError(
      "Authenticated user has no valid identity.",
      403
    );
  }

  // Coordinator sees only audits assigned to them.
  if (role === "audit_coordinator") {
    return {
      auditCoordinator: name,
    };
  }

  // Lead sees only audits where explicitly assigned as Lead.
  if (role === "lead_auditor") {
    return {
      leadAuditor: name,
    };
  }

  // Auditor sees only audits in their assigned team.
  if (role === "auditor") {
    return {
      auditors: name,
    };
  }

  /*
   * Prakalpa Managers do not receive Scheduled Audit access.
   * Their jurisdiction belongs to the Reports workflow.
   *
   * Unknown roles are also denied by returning an impossible
   * MongoDB condition.
   */
  return {
    _id: null,
  };
};


export const getScheduledAudits = async (
  query = {},
  user
) => {
  const filter = {
    ...getScheduledAuditJurisdiction(user),
  };

  /*
   * Client filters may narrow results but cannot broaden
   * backend jurisdiction.
   */
  if (query.prakalpa) {
    filter.prakalpa =
      String(query.prakalpa).trim();
  }

  if (query.location) {
    filter.location =
      String(query.location).trim();
  }

  return await ScheduledAudit.find(filter).sort({
    createdAt: -1,
  });
};


export const getScheduledAuditById = async (
  id,
  user
) => {
  const jurisdiction =
    getScheduledAuditJurisdiction(user);

  const audit = await ScheduledAudit.findOne({
    _id: id,
    ...jurisdiction,
  });

  /*
   * Use the same response for a missing record and a record
   * outside jurisdiction. This avoids leaking its existence.
   */
  if (!audit) {
    throw new AppError(
      "Scheduled audit not found",
      404
    );
  }

  return audit;
};

/*
 * ============================================================
 * Scheduled Audit management jurisdiction
 * ============================================================
 *
 * Viewing an audit and managing an audit are intentionally
 * separate permissions.
 *
 * - Super Admin / Admin: application-wide oversight
 * - Audit Coordinator: only audits assigned to themselves
 * - Lead Auditor: no scheduling-management authority
 * - Auditor: no scheduling-management authority
 * - Prakalpa Manager: no scheduling-management authority
 */
const getManagedScheduledAudit = async (
  id,
  user
) => {
  if (!user) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  const role =
    normalizeUserValue(user.role);

  const name =
    normalizeUserValue(user.name);

  const filter = {
    _id: id,
  };

  if (
    role === "admin"
  ) {
    // Administrative management authority.
  } else if (
    role === "audit_coordinator"
  ) {
    if (!name) {
      throw new AppError(
        "Authenticated user has no valid identity.",
        403
      );
    }

    filter.auditCoordinator = name;
  } else {
    throw new AppError(
      "You are not authorized to manage this scheduled audit.",
      403
    );
  }

  const audit =
    await ScheduledAudit.findOne(filter);

  /*
   * Same response for nonexistent and out-of-jurisdiction
   * records so another audit's existence is not disclosed.
   */
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
  data,
  user
) => {
  const audit =
    await getManagedScheduledAudit(
      id,
      user
    );

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
   * Resolve Lead Auditor independently from the ordinary
   * auditor list.
   *
   * leadAuditor is the canonical workflow field.
   */
  const nextLeadAuditor = String(
    data.leadAuditor !== undefined
      ? data.leadAuditor
      : audit.leadAuditor || ""
  ).trim();

  if (!nextLeadAuditor) {
    throw new AppError(
      "Lead Auditor is required.",
      400
    );
  }

  /*
   * Lead Auditor is an independent workflow role.
   *
   * Do not require the Lead Auditor to also appear in the
   * ordinary auditors[] team.
   *
   * Validate instead that the selected person is an active
   * Lead Auditor account.
   */
  const leadAuditorUser =
    await User.findOne({
      name: nextLeadAuditor,
      role: "lead_auditor",
      active: true,
    }).select("_id name role active");

  if (!leadAuditorUser) {
    throw new AppError(
      "Selected Lead Auditor is not an active Lead Auditor account.",
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
   * Persist the explicit Lead Auditor.
   *
   * Do not silently assign another auditor if the Lead
   * Auditor is removed from the team. The coordinator must
   * explicitly choose the replacement.
   */
  audit.leadAuditor =
    nextLeadAuditor;

  await audit.save();

  return audit;
};

export const completeScheduledAudit = async (
  id,
  user
) => {
  const audit =
    await getManagedScheduledAudit(
      id,
      user
    );

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
  id,
  user
) => {
  /*
   * Prove ownership before deletion.
   */
  const audit =
    await getManagedScheduledAudit(
      id,
      user
    );

  await ScheduledAudit.deleteOne({
    _id: audit._id,
  });

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
  payload = {},
  user
) => {
  const audit =
    await getManagedScheduledAudit(
      id,
      user
    );

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
  audit.mailSentTo = [
    ...new Set([
      ...toList,
      ...ccList,
    ]),
  ];

  await audit.save();

  return audit;
};

export const markMailSent = async (
  id,
  user
) => {
  const audit =
    await getManagedScheduledAudit(
      id,
      user
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
