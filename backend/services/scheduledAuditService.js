import { withAuditWrite, assertAuditHistoryCanBeRemoved } from './legacyAuditWriteBarrier.js';
import { assertAuditEndReached, assertScheduledAuditOutcome } from "./scheduledAuditOutcome.js";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import mongoose from "mongoose";
import ScheduledAudit from "../models/ScheduledAudit.js";
import AuditFinding from "../models/AuditFinding.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import Report from "../models/Report.js";
import CoordinatorBatchClosure from "../models/CoordinatorBatchClosure.js";
import { assertConsolidatedAuditReadyForCompletion } from "./consolidatedCompletionGuard.js";
import { acquireConsolidatedAuditWriteBarrier } from "./consolidatedAuditWriteBarrier.js";
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

  // Auditor sees audits assigned to them as a team member or Lead Auditor.
  if (role === "auditor") {
    return {
      $or: [
        { auditors: name },
        { leadAuditor: name },
      ],
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

  const audits = await ScheduledAudit.find(filter).sort({
    createdAt: -1,
  });

  /*
   * Keep the Scheduled Audit document permanently.
   * Only remove a fully reported IQA from the ACTIVE listing.
   *
   * This is intentionally fail-open for visibility:
   * missing, incomplete or inconsistent report references
   * keep the IQA visible so it can be recovered.
   */
  const completed = audits.filter(
    (audit) => audit.status === "completed"
  );

  if (completed.length === 0) {
    return audits;
  }

  const ids = completed.map((audit) => audit._id);

  const [originals, consolidated, reports, closures] = await Promise.all([
    AuditFinding.find({
      scheduledAudit: { $in: ids },
    })
      .select("_id scheduledAudit workflowStatus")
      .lean(),
    ConsolidatedFinding.find({
      scheduledAudit: { $in: ids },
    })
      .select("_id scheduledAudit workflowStatus")
      .lean(),
    Report.find({
      scheduledAudit: { $in: ids },
    })
      .select(
        "_id scheduledAudit sourceFinding sourceConsolidatedFinding"
      )
      .lean(),
    CoordinatorBatchClosure.find({scheduledAudit:{$in:ids}}).select("scheduledAudit").lean(),
  ]);

  const groupedOriginals = new Map();
  const groupedConsolidated = new Map();
  const reportedOriginalIds = new Set();
  const reportedConsolidatedIds = new Set();

  for (const finding of originals) {
    const key = String(finding.scheduledAudit);
    if (!groupedOriginals.has(key)) {
      groupedOriginals.set(key, []);
    }
    groupedOriginals.get(key).push(finding);
  }

  for (const finding of consolidated) {
    const key = String(finding.scheduledAudit);
    if (!groupedConsolidated.has(key)) {
      groupedConsolidated.set(key, []);
    }
    groupedConsolidated.get(key).push(finding);
  }

  for (const report of reports) {
    const auditId = String(report.scheduledAudit);
    if (report.sourceFinding) {
      reportedOriginalIds.add(
        auditId + ":" + String(report.sourceFinding)
      );
    }
    if (report.sourceConsolidatedFinding) {
      reportedConsolidatedIds.add(
        auditId + ":" + String(report.sourceConsolidatedFinding)
      );
    }
  }

  const closedLegacyIds = new Set(closures.map(c=>String(c.scheduledAudit)));
  const fullyReportedIds = new Set(closedLegacyIds);

  for (const audit of completed) {
    const key = String(audit._id);
    const isConsolidated =
      audit.workflowMode === "consolidated";

    const findings = isConsolidated
      ? (groupedConsolidated.get(key) || [])
      : (groupedOriginals.get(key) || []);

    const reportedIds = isConsolidated
      ? reportedConsolidatedIds
      : reportedOriginalIds;

    /*
     * Zero findings must not cause an audit to disappear.
     * Every applicable finding must have been converted AND
     * must have a corresponding official Report record.
     */
    const allReported =
      findings.length > 0 &&
      findings.every(
        (finding) =>
          (finding.workflowStatus === "discarded_by_lead" || finding.workflowStatus === "discarded_by_coordinator" || (finding.workflowStatus === "converted_to_report" &&
          reportedIds.has(key + ":" + String(finding._id))))
      );

    if (allReported) {
      fullyReportedIds.add(key);
    }
  }

  return audits.filter(
    (audit) => !fullyReportedIds.has(String(audit._id))
  );
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
    role === "admin" ||
    role === "super_admin"
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
  await getManagedScheduledAudit(id, user);

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "workflowMode"
    )
  ) {
    throw new AppError(
      "Scheduled Audit workflow mode cannot be changed through this endpoint.",
      400
    );
  }

  return withAuditWrite(id, async (audit, session) => {
  if (user.role === 'audit_coordinator' && audit.auditCoordinator !== user.name) throw new AppError('This audit is outside your assignment.', 403);
  if (
    audit.workflowMode !== undefined &&
    audit.workflowMode !== "legacy" &&
    audit.workflowMode !== "consolidated"
  ) {
    throw new AppError(
      "Scheduled Audit has an invalid workflow mode and requires administrative review.",
      409
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
  if (!nextAuditors.includes(nextLeadAuditor)) {
    throw new AppError(
      "Lead Auditor must be one of the assigned auditors.",
      400
    );
  }

  const leadAuditorUser =
    await User.findOne({
      name: nextLeadAuditor,
      role: "auditor",
      active: true,
    }).select("_id name role active");

  if (!leadAuditorUser) {
    throw new AppError(
      "Selected Lead Auditor must be an active Auditor account.",
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
      ).session(session);
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
      }).session(session);
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

  await auditPlan.save({ session });

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

  await audit.save({ session });

  return audit;
  });
};

export const completeScheduledAudit = async (
  id,
  user
) => {
  // Preserve the existing management authorization.
  const audit = await getManagedScheduledAudit(id, user);

  if (audit.status === "completed") {
    return audit;
  }

  assertAuditEndReached(audit);

  const session = await mongoose.startSession();

  try {
    const completedAudit = await session.withTransaction(async () => {
      // This document write serializes completion with all
      // finding/declaration/lifecycle operations using the same barrier.
      const lockedAudit = await acquireConsolidatedAuditWriteBarrier(
        audit._id,
        session,
        { allowAllClear: true, allowLegacy: audit.workflowMode !== "consolidated" }
      );
      if (user.role === "audit_coordinator" && String(lockedAudit.auditCoordinator).trim() !== String(user.name).trim()) {
        throw new AppError("This audit is outside your Coordinator assignment.", 403);
      }
      assertAuditEndReached(lockedAudit);
      const outcome = await assertScheduledAuditOutcome(lockedAudit, session);
      lockedAudit.outcome = outcome;
      if (outcome === 'all_clear' && await ScheduledAudit.exists({ auditPlan: lockedAudit.auditPlan, _id: { $ne: lockedAudit._id } }).session(session)) throw new AppError('Multiple Scheduled Audits reference this plan; administrative review is required before completion.', 409);

      if (!lockedAudit.auditPlan) throw new AppError("Linked Audit Plan is missing; review is required before completion.", 409);
      lockedAudit.status = "completed";
      lockedAudit.completedAt = new Date();
      lockedAudit.completedBy = user._id;
      await lockedAudit.save({ session });

      if (lockedAudit.auditPlan) {
        const auditPlan = await AuditPlan.findById(
          lockedAudit.auditPlan
        ).session(session);

        if (!auditPlan) throw new AppError("Linked Audit Plan not found; review is required before completion.", 409);
        if (auditPlan) {
          auditPlan.status = "completed";
          await auditPlan.save({ session });
        }
      }

      return lockedAudit;
    });

    return completedAudit;
  } finally {
    await session.endSession();
  }
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

  return withAuditWrite(audit._id, async (locked, session) => {
    if (user.role === 'audit_coordinator' && locked.auditCoordinator !== user.name) throw new AppError('This audit is outside your assignment.', 403);
    await assertAuditHistoryCanBeRemoved(locked, session);
    await ScheduledAudit.deleteOne({ _id: locked._id }, { session });
    return locked;
  });
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

// Read-only presentation eligibility. Mutation always rechecks under the transaction barrier.
export const getCompletionEligibility = async user => {
  const audits = await getScheduledAudits({}, user);
  const result = {};
  for (const audit of audits) {
    const id = String(audit._id);
    try {
      if (audit.status === "completed") { result[id] = { eligible: false, reason: "Audit already completed." }; continue; }
      assertAuditEndReached(audit);
      const outcome = await assertScheduledAuditOutcome(audit);
      result[id] = { eligible: true, reason: "Approved audit outcome and scheduled end time verified.", outcome };
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      result[id] = { eligible: false, reason: err.message };
    }
  }
  return result;
};
