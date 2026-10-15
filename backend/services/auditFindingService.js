import mongoose from "mongoose";
import { createHash } from "node:crypto";

import AuditFinding from "../models/AuditFinding.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import ConsolidatedFindingSourceClaim from "../models/ConsolidatedFindingSourceClaim.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import AuditorSubmission from "../models/AuditorSubmission.js";
import LeadBatchSubmission from "../models/LeadBatchSubmission.js";
import CoordinatorBatchClosure from "../models/CoordinatorBatchClosure.js";
import AppError from "../utils/AppError.js";
import { acquireConsolidatedAuditWriteBarrier } from "./consolidatedAuditWriteBarrier.js";


const normalize = (value) =>
  String(value || "").trim();

const getScheduledAuditWorkflowMode = (audit) => {
  const mode = audit?.workflowMode;

  if (mode === undefined) {
    return "legacy";
  }

  if (mode === "legacy" || mode === "consolidated") {
    return mode;
  }

  throw new AppError(
    "Scheduled Audit has an invalid workflow mode and requires administrative review.",
    409
  );
};

const assertScheduledAuditWorkflowMode = (
  audit,
  expectedMode,
  message
) => {
  const mode = getScheduledAuditWorkflowMode(audit);

  if (mode !== expectedMode) {
    throw new AppError(message, 409);
  }
};


const assertObjectId = (
  value,
  label
) => {
  if (!mongoose.isValidObjectId(value)) {
    throw new AppError(
      `${label} is invalid.`,
      400
    );
  }
};

const normalizeClassification = (
  value
) => {
  const normalized =
    normalize(value)
      .toUpperCase();

  if (
    normalized === "NC" ||
    normalized === "OFI"
  ) {
    return normalized;
  }

  return null;
};

const getDateKeyInTimeZone = (
  dateValue,
  timeZone = "Asia/Kolkata"
) => {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    ).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  if (
    !values.year ||
    !values.month ||
    !values.day
  ) {
    return null;
  }

  return `${values.year}-${values.month}-${values.day}`;
};

const assertScheduledAuditOpenForFindings = (
  audit
) => {
  if (
    audit?.workflowMode === "consolidated" &&
    audit.status === "completed"
  ) {
    throw new AppError(
      "This consolidated Scheduled Audit is completed. Auditor findings can no longer be created, edited, or submitted.",
      409
    );
  }

  if (!audit || !audit.startDate) {
    throw new AppError(
      "Scheduled audit does not have a valid start date.",
      400
    );
  }

  const startDate =
    new Date(audit.startDate);
  const now = new Date();

  if (
    Number.isNaN(
      startDate.getTime()
    )
  ) {
    throw new AppError(
      "Scheduled audit start date is invalid.",
      400
    );
  }

  const currentKolkataDay =
    getDateKeyInTimeZone(
      now,
      "Asia/Kolkata"
    );

  const auditStartDay =
    getDateKeyInTimeZone(
      startDate,
      "Asia/Kolkata"
    );

  if (
    !currentKolkataDay ||
    !auditStartDay
  ) {
    throw new AppError(
      "Scheduled audit start date is invalid.",
      400
    );
  }

  if (currentKolkataDay < auditStartDay) {
    throw new AppError(
      "Finding creation and submission are only allowed from the Scheduled Audit start date onward.",
      403
    );
  }
};

const assertAssignedAuditorForSchedule = async (
  scheduledAuditId,
  currentUser
) => {
  if (!currentUser) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  if (
    normalize(currentUser.role) !== "auditor"
  ) {
    throw new AppError(
      "Only an Auditor can manage audit findings.",
      403
    );
  }

  assertObjectId(
    scheduledAuditId,
    "Scheduled Audit"
  );

  const audit =
    await ScheduledAudit.findById(
      scheduledAuditId
    );

  if (!audit) {
    throw new AppError(
      "Scheduled Audit not found.",
      404
    );
  }

  getScheduledAuditWorkflowMode(audit);

  const userName =
    normalize(currentUser.name);

  if (!userName) {
    throw new AppError(
      "Your account does not have a valid auditor name.",
      403
    );
  }

  const assignedAuditors =
    (audit.auditors || [])
      .map(normalize)
      .filter(Boolean);

  if (!assignedAuditors.includes(userName) && normalize(audit.leadAuditor) !== userName) {
    throw new AppError(
      "You are not assigned as an Auditor for this audit.",
      403
    );
  }

  return audit;
};

const assertOwnDraftFinding = async (
  findingId,
  currentUser
) => {
  assertObjectId(
    findingId,
    "Audit Finding"
  );

  const finding =
    await AuditFinding.findById(
      findingId
    );

  if (!finding) {
    throw new AppError(
      "Audit finding not found.",
      404
    );
  }

  if (
    normalize(currentUser.role) !== "auditor"
  ) {
    throw new AppError(
      "Only an Auditor can manage audit findings.",
      403
    );
  }

  const ownerId =
    finding.auditor ||
    finding.submittedBy;

  if (
    String(ownerId) !==
    String(currentUser._id)
  ) {
    throw new AppError(
      "You can only edit your own draft findings.",
      403
    );
  }

  const audit =
    await ScheduledAudit.findById(
      finding.scheduledAudit
    );

  if (!audit) {
    throw new AppError(
      "Scheduled Audit not found.",
      404
    );
  }

  const assignedAuditors =
    (audit.auditors || [])
      .map(normalize)
      .filter(Boolean);

  const userName =
    normalize(currentUser.name);

  if (
    !userName ||
    (!assignedAuditors.includes(userName) && normalize(audit.leadAuditor) !== userName)
  ) {
    throw new AppError(
      "You are not assigned as an Auditor for this audit.",
      403
    );
  }

  return {
    finding,
    audit,
  };
};


/*
 * Assignment authorization is deliberately derived from
 * ScheduledAudit because current scheduling uses names.
 *
 * We additionally persist the authenticated User ObjectId
 * on AuditFinding for stable ownership/history.
 */
const assertAssignedAuditor = (
  audit,
  currentUser
) => {
  if (!currentUser) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  if (currentUser.role !== "auditor") {
    throw new AppError(
      "Only an Auditor can submit audit findings.",
      403
    );
  }

  const userName =
    normalize(currentUser.name);

  if (!userName) {
    throw new AppError(
      "Your account does not have a valid auditor name.",
      403
    );
  }

  const assignedAuditors =
    (audit.auditors || [])
      .map(normalize)
      .filter(Boolean);

  if (!assignedAuditors.includes(userName) && normalize(audit.leadAuditor) !== userName) {
    throw new AppError(
      "You are not assigned as an Auditor for this audit.",
      403
    );
  }
};


const validateFindingPayload = (
  data,
  audit
) => {
  const auditArea =
    normalize(data.auditArea);

  const findings =
    normalize(data.findings);

  const severity =
    normalize(data.severity);

  const visitTime =
    normalize(data.visitTime);

  if (!auditArea) {
    throw new AppError(
      "Audit Area is required.",
      400
    );
  }

  /*
   * Do not allow the browser to invent an audit area.
   */
  const allowedAreas =
    (audit.auditAreas || [])
      .map(normalize)
      .filter(Boolean);

  if (
    allowedAreas.length > 0 &&
    !allowedAreas.includes(auditArea)
  ) {
    throw new AppError(
      "Selected Audit Area is not assigned to this audit.",
      400
    );
  }

  if (!findings) {
    throw new AppError(
      "Finding details are required.",
      400
    );
  }

  if (
    ![
      "open_for_improvement",
      "non_conformance",
    ].includes(severity)
  ) {
    throw new AppError(
      "Invalid finding severity.",
      400
    );
  }

  if (!data.visitDate) {
    throw new AppError(
      "Visit Date is required.",
      400
    );
  }

  const visitDate =
    new Date(data.visitDate);

  if (
    Number.isNaN(
      visitDate.getTime()
    )
  ) {
    throw new AppError(
      "Visit Date is invalid.",
      400
    );
  }

  if (!visitTime) {
    throw new AppError(
      "Visit Time is required.",
      400
    );
  }

  return {
    auditArea,
    findings,
    severity,
    visitDate,
    visitTime,
  };
};

// Every submitted-finding writer and final closure shares this transaction barrier.
const acquireFindingSubmissionBarrier = async (auditId, session) => {
  const audit = await ScheduledAudit.findById(auditId).session(session);
  if (!audit) throw new AppError("Scheduled Audit not found.", 404);
  if (getScheduledAuditWorkflowMode(audit) === "consolidated") {
    return acquireConsolidatedAuditWriteBarrier(auditId, session);
  }
  await ScheduledAudit.updateOne({ _id: auditId }, { $inc: { workflowRevision: 1 } }, { session });
  if (await CoordinatorBatchClosure.exists({ scheduledAudit: auditId }).session(session)) {
    throw new AppError("The Coordinator has finalized this audit. Submissions and handovers are closed.", 409);
  }
  return audit;
};

const normalizeHandoverRequest = (data) => {
  if (!data || typeof data.requestId !== "string" ||
      !/^[A-Za-z0-9-]{16,100}$/.test(data.requestId) ||
      typeof data.confirmation !== "string" || !/^[a-f0-9]{64}$/.test(data.confirmation) ||
      !Array.isArray(data.findingIds) ||
      data.findingIds.some(id => typeof id !== "string" || !mongoose.isValidObjectId(id)) ||
      new Set(data.findingIds).size !== data.findingIds.length) {
    throw new AppError("A request ID and exact confirmed finding membership are required. Refresh and confirm again.", 400);
  }
  return { requestId: data.requestId, confirmation: data.confirmation, findingIds: [...data.findingIds].sort() };
};

const sameMembership = (a, b) => JSON.stringify(a.map(String).sort()) === JSON.stringify(b.map(String).sort());
const handoverConfirmation = (findings) => createHash("sha256").update(JSON.stringify(
  findings.map(f => [String(f._id), f.workflowStatus, f.status, f.classification, f.severity,
    f.leadEditedCopy?.revision || 0, f.leadReviewedAt || null, f.updatedAt || null,
    f.title || "", f.sourceFindings?.map(String).sort() || []]).sort((a, b) => a[0].localeCompare(b[0]))
)).digest("hex");

const selectUnforwardedLegacyFindings = (findings, handover) => {
  const recorded = new Set([
    ...(handover?.initialHandover?.findingIds || []),
    ...(handover?.supplementalHandovers || []).flatMap(h => h.findingIds || []),
  ].map(String));
  if (handover && !handover.initialHandover) {
    const historicalDiscards = findings.filter(f => f.workflowStatus === "discarded_by_lead" &&
      !recorded.has(String(f._id)) && f.leadReviewedAt &&
      new Date(f.leadReviewedAt).getTime() <= new Date(handover.submittedAt).getTime());
    if (historicalDiscards.length !== handover.discardedCount) {
      throw new AppError("Historical discarded-finding counts require reconciliation before supplemental handover.", 409);
    }
  }
  return findings.filter(f => {
    if (recorded.has(String(f._id)) || ["submitted_to_coordinator", "converted_to_report", "discarded_by_coordinator", "auditor_draft"].includes(f.workflowStatus)) return false;
    if (handover && !handover.initialHandover && f.workflowStatus === "discarded_by_lead") {
      // Old handovers have no membership. Only a recorded review timestamp is reliable.
      const reviewed = new Date(f.leadReviewedAt).getTime();
      const sent = new Date(handover.submittedAt).getTime();
      if (!f.leadReviewedAt || !Number.isFinite(reviewed) || !Number.isFinite(sent)) {
        throw new AppError("Historical discarded-finding membership requires reconciliation before supplemental handover.", 409);
      }
      if (reviewed <= sent) return false;
    }
    return true;
  });
};

const assertHandoverCapacity = (document) => {
  // Reserve 1 KiB for Mongoose timestamps/versioning, below MongoDB's 16 MiB BSON ceiling.
  if (mongoose.mongo.BSON.calculateObjectSize(document) > 16 * 1024 * 1024 - 1024) {
    throw new AppError("Handover history is at MongoDB's document size limit. Administrator review is required; no findings were sent.", 413);
  }
};

const assertAuditorBatchNotSubmitted = async (auditId, auditorId) => {
  if (await CoordinatorBatchClosure.exists({ scheduledAudit: auditId })) {
    throw new AppError("The Coordinator has finalized this audit. Submissions are closed.", 409);
  }
  const existing = await AuditorSubmission.exists({ scheduledAudit: auditId, auditor: auditorId });
  if (existing) throw new AppError("Your final findings batch has already been sent and cannot be changed or sent again.", 409);
};

export const getAuditorSubmissionStatus = async (auditId, currentUser) => {
  await assertAssignedAuditorForSchedule(auditId, currentUser);
  return await AuditorSubmission.findOne({ scheduledAudit: auditId, auditor: currentUser._id }).lean();
};

export const submitAllAuditorFindings = async (auditId, currentUser) => {
  const audit = await assertAssignedAuditorForSchedule(auditId, currentUser);
  assertScheduledAuditOpenForFindings(audit);
  if (!normalize(audit.leadAuditor)) throw new AppError("A Lead Auditor must be assigned before submission.", 409);
  let session;
  try {
    session = await mongoose.startSession();
    return await session.withTransaction(async () => {
      const lockedAudit = await acquireFindingSubmissionBarrier(audit._id, session);
      assertAssignedAuditor(lockedAudit, currentUser);
      assertScheduledAuditOpenForFindings(lockedAudit);
      if (!normalize(lockedAudit.leadAuditor)) throw new AppError("A Lead Auditor must be assigned before submission.", 409);
      if (lockedAudit.status === "completed") throw new AppError("Audit is no longer open for submission.", 409);
      const existing = await AuditorSubmission.findOne({ scheduledAudit: audit._id, auditor: currentUser._id }).session(session);
      if (existing) throw new AppError("Your findings have already been submitted. They cannot be unsent.", 409);
      const findings = await AuditFinding.find({ scheduledAudit: audit._id, auditor: currentUser._id }).session(session);
      if (findings.some(f => f.workflowStatus !== "auditor_draft" || f.status !== "DRAFT")) {
        throw new AppError("All findings must be drafts before final batch submission. Contact the administrator about earlier submissions.", 409);
      }
      const now = new Date();
      await AuditorSubmission.create([{ scheduledAudit: audit._id, auditor: currentUser._id,
        auditorName: normalize(currentUser.name), findingCount: findings.length,
        iqaNumber: audit.iqaNumber, submittedAt: now }], { session });
      if (findings.length) await AuditFinding.updateMany({ scheduledAudit: audit._id, auditor: currentUser._id,
        workflowStatus: "auditor_draft", status: "DRAFT" }, { $set: {
        status: "SUBMITTED", workflowStatus: "submitted_to_lead", submittedAt: now, submittedToLeadAt: now
      } }, { session });
      return { submitted: true, findingCount: findings.length, iqaNumber: audit.iqaNumber, submittedAt: now };
    });
  } catch (error) {
    if (error?.code === 11000) throw new AppError("This Auditor batch has already been submitted.", 409);
    if (error?.codeName === "IllegalOperation" || /transaction numbers are only allowed|does not support transactions/i.test(error?.message || "")) {
      throw new AppError("Final submission requires a transaction-capable MongoDB replica set.", 503);
    }
    throw error;
  } finally { if (session) await session.endSession(); }
};

export const createAuditFindingDraft = async (
  scheduledAuditId,
  payload = {},
  currentUser
) => {
  const audit =
    await assertAssignedAuditorForSchedule(
      scheduledAuditId,
      currentUser
    );

  assertScheduledAuditOpenForFindings(audit);
  await assertAuditorBatchNotSubmitted(audit._id, currentUser._id);

  const description =
    normalize(payload.description);

  if (!description) {
    throw new AppError(
      "Finding description is required.",
      400
    );
  }

  const classification =
    normalizeClassification(
      payload.classification
    );

  if (
    payload.classification !== undefined &&
    !classification
  ) {
    throw new AppError(
      "Classification must be NC or OFI.",
      400
    );
  }

  const finding =
    await AuditFinding.create({
      auditPlan: audit.auditPlan,
      scheduledAudit: audit._id,
      auditor: currentUser._id,
      submittedBy: currentUser._id,
      submittedByName: normalize(currentUser.name),
      description,
      findings: description,
      classification,
      status: "DRAFT",
      workflowStatus: "auditor_draft",
      iqaNumber: audit.iqaNumber,
      prakalpa: audit.prakalpa,
      location: audit.location,
      sublocation: audit.sublocation || "",
      auditCoordinator: audit.auditCoordinator,
      leadAuditor: audit.leadAuditor || "",
      auditArea: audit.auditAreas?.[0] || "",
      severity:
        classification === "NC"
          ? "non_conformance"
          : "open_for_improvement",
      visitDate: audit.startDate,
      visitTime: "00:00",
    });

  return finding;
};

export const getScheduledAuditFindings = async (
  scheduledAuditId,
  currentUser
) => {
  await assertAssignedAuditorForSchedule(
    scheduledAuditId,
    currentUser
  );

  const findings =
    await AuditFinding.find({
      scheduledAudit:
        scheduledAuditId,
      auditor: currentUser._id,
    }).sort({
      createdAt: -1,
    });

  return findings;
};

export const updateAuditFindingDraft = async (
  findingId,
  payload = {},
  currentUser
) => {
  const { finding, audit } =
    await assertOwnDraftFinding(
      findingId,
      currentUser
    );

  if (finding.status !== "DRAFT") {
    throw new AppError(
      "Only draft findings can be edited.",
      409
    );
  }

  assertScheduledAuditOpenForFindings(audit);
  await assertAuditorBatchNotSubmitted(audit._id, currentUser._id);

  if (
    payload.description !== undefined
  ) {
    const description =
      normalize(payload.description);

    if (!description) {
      throw new AppError(
        "Finding description is required.",
        400
      );
    }

    finding.description = description;
    finding.findings = description;
  }

  if (
    payload.classification !== undefined
  ) {
    const classification =
      normalizeClassification(
        payload.classification
      );

    if (!classification) {
      throw new AppError(
        "Classification must be NC or OFI.",
        400
      );
    }

    finding.classification = classification;
    finding.severity =
      classification === "NC"
        ? "non_conformance"
        : "open_for_improvement";
  }

  await finding.save();

  return finding;
};

export const submitAuditFindingDraft = async (
  findingId,
  currentUser
) => {
  const { finding, audit } =
    await assertOwnDraftFinding(
      findingId,
      currentUser
    );

  if (finding.status !== "DRAFT") {
    throw new AppError(
      "Only draft findings can be submitted.",
      409
    );
  }

  assertScheduledAuditOpenForFindings(audit);
  await assertAuditorBatchNotSubmitted(audit._id, currentUser._id);

  let session;

  try {
    session = await mongoose.startSession();

    return await session.withTransaction(async () => {
      const lockedAudit =
        await acquireFindingSubmissionBarrier(
          audit._id,
          session
        );

      assertAssignedAuditor(lockedAudit, currentUser);
      assertScheduledAuditOpenForFindings(lockedAudit);
      if (await AuditorSubmission.exists({ scheduledAudit: audit._id, auditor: currentUser._id }).session(session)) throw new AppError("Your findings have already been submitted.", 409);

      const currentFinding = await AuditFinding.findById(
        findingId
      ).session(session);

      if (!currentFinding) {
        throw new AppError(
          "Audit finding not found.",
          404
        );
      }

      if (
        String(currentFinding.scheduledAudit) !==
          String(lockedAudit._id) ||
        String(currentFinding.auditor || currentFinding.submittedBy) !==
          String(currentUser._id)
      ) {
        throw new AppError(
          "You cannot submit another Auditor's finding.",
          403
        );
      }

      if (currentFinding.status !== "DRAFT") {
        throw new AppError(
          "Only draft findings can be submitted.",
          409
        );
      }

      const now = new Date();

      currentFinding.status = "SUBMITTED";
      currentFinding.submittedAt = now;
      currentFinding.workflowStatus = "submitted_to_lead";
      currentFinding.submittedToLeadAt = now;

      await currentFinding.save({ session });

      return currentFinding;
    });
  } catch (error) {
    if (
      error?.codeName === "IllegalOperation" ||
      /transaction numbers are only allowed|does not support transactions/i.test(
        error?.message || ""
      )
    ) {
      throw new AppError(
        "Consolidated Auditor submission requires a transaction-capable MongoDB replica set.",
        503
      );
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

export const submitFindingToLead =
  async (
    data = {},
    currentUser
  ) => {
    const scheduledAuditId =
      data.scheduledAudit;

    assertObjectId(
      scheduledAuditId,
      "Scheduled Audit"
    );

    const audit =
      await ScheduledAudit.findById(
        scheduledAuditId
      );

    if (!audit) {
      throw new AppError(
        "Scheduled Audit not found.",
        404
      );
    }

    assertAssignedAuditor(
      audit,
      currentUser
    );
    await assertAuditorBatchNotSubmitted(audit._id, currentUser._id);

    /*
     * A Lead Auditor must exist before an Auditor can submit.
     */
    const leadAuditor =
      normalize(audit.leadAuditor);

    if (!leadAuditor) {
      throw new AppError(
        "A Lead Auditor has not been assigned to this audit.",
        409
      );
    }

    const validated =
      validateFindingPayload(
        data,
        audit
      );

    const now = new Date();

    const findingPayload = {
        auditPlan:
          audit.auditPlan,

        scheduledAudit:
          audit._id,

        iqaNumber:
          audit.iqaNumber,

        prakalpa:
          audit.prakalpa,

        location:
          audit.location,

        sublocation:
          audit.sublocation || "",

        auditCoordinator:
          audit.auditCoordinator,

        leadAuditor,

        submittedBy:
          currentUser._id,

        submittedByName:
          normalize(
            currentUser.name
          ),

        auditArea:
          validated.auditArea,

        severity:
          validated.severity,

        findings:
          validated.findings,

        proofFiles:
          Array.isArray(
            data.proofFiles
          )
            ? data.proofFiles
                .map(normalize)
                .filter(Boolean)
            : [],

        hasChecklist:
          Boolean(
            data.hasChecklist
          ),

        visitDate:
          validated.visitDate,

        visitTime:
          validated.visitTime,

        status:
          "SUBMITTED",

        workflowStatus:
          "submitted_to_lead",

        submittedAt:
          now,

        submittedToLeadAt:
          now,

        auditor:
          currentUser._id,

        workflowHistory: [
          {
            action:
              "submitted_to_lead",

            fromStatus:
              "",

            toStatus:
              "submitted_to_lead",

            performedBy:
              currentUser._id,

            performedByName:
              normalize(
                currentUser.name
              ),

            role:
              currentUser.role,

            performedAt:
              now,
          },
        ],
      };

    let session;

    try {
      session = await mongoose.startSession();

      return await session.withTransaction(async () => {
        const lockedAudit =
          await acquireFindingSubmissionBarrier(
            audit._id,
            session
          );

        assertAssignedAuditor(lockedAudit, currentUser);
        assertScheduledAuditOpenForFindings(lockedAudit);
        if (await AuditorSubmission.exists({ scheduledAudit: audit._id, auditor: currentUser._id }).session(session)) throw new AppError("Your findings have already been submitted.", 409);

        const currentLeadAuditor =
          normalize(lockedAudit.leadAuditor);

        if (!currentLeadAuditor) {
          throw new AppError(
            "A Lead Auditor has not been assigned to this audit.",
            409
          );
        }

        const currentValidated =
          validateFindingPayload(data, lockedAudit);

        const safePayload = {
          ...findingPayload,
          auditPlan: lockedAudit.auditPlan,
          scheduledAudit: lockedAudit._id,
          iqaNumber: lockedAudit.iqaNumber,
          prakalpa: lockedAudit.prakalpa,
          location: lockedAudit.location,
          sublocation: lockedAudit.sublocation || "",
          auditCoordinator: lockedAudit.auditCoordinator,
          leadAuditor: currentLeadAuditor,
          auditArea: currentValidated.auditArea,
          severity: currentValidated.severity,
          findings: currentValidated.findings,
          visitDate: currentValidated.visitDate,
          visitTime: currentValidated.visitTime,
        };

        const created = await AuditFinding.create(
          [safePayload],
          { session }
        );

        return created[0];
      });
    } catch (error) {
      if (
        error?.codeName === "IllegalOperation" ||
        /transaction numbers are only allowed|does not support transactions/i.test(
          error?.message || ""
        )
      ) {
        throw new AppError(
          "Consolidated Auditor submission requires a transaction-capable MongoDB replica set.",
          503
        );
      }

      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }

  };


const normalizeSourceFindingIds = (
  sourceFindings
) => {
  const values =
    Array.isArray(sourceFindings)
      ? sourceFindings
      : [sourceFindings];

  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const candidate =
      normalize(value);

    if (!candidate) {
      continue;
    }

    if (!mongoose.isValidObjectId(candidate)) {
      throw new AppError(
        "Each source finding ID must be a valid ObjectId.",
        400
      );
    }

    if (seen.has(candidate)) {
      throw new AppError(
        "Duplicate source finding IDs are not allowed.",
        400
      );
    }

    seen.add(candidate);
    normalized.push(candidate);
  }

  if (normalized.length === 0) {
    throw new AppError(
      "At least one source finding is required.",
      400
    );
  }

  return normalized;
};

const assertLeadAuditorForScheduledAudit = async (
  scheduledAuditId,
  currentUser
) => {
  if (!currentUser) {
    throw new AppError(
      "Authentication required.",
      401
    );
  }

  if (
    normalize(currentUser.role) !== "auditor"
  ) {
    throw new AppError(
      "Only the assigned Lead Auditor can manage consolidated findings.",
      403
    );
  }

  assertObjectId(
    scheduledAuditId,
    "Scheduled Audit"
  );

  const audit =
    await ScheduledAudit.findById(
      scheduledAuditId
    );

  if (!audit) {
    throw new AppError(
      "Scheduled Audit not found.",
      404
    );
  }

  const userName =
    normalize(currentUser.name);
  const leadName =
    normalize(audit.leadAuditor);

  if (!userName || !leadName || userName !== leadName) {
    throw new AppError(
      "You are not the assigned Lead Auditor for this audit.",
      403
    );
  }

  return audit;
};

const appendConsolidatedHistory = (
  record,
  {
    action,
    fromStatus,
    toStatus,
    currentUser,
    remarks = "",
    performedAt = new Date(),
  }
) => {
  record.workflowHistory.push({
    action,
    fromStatus,
    toStatus,
    performedBy: currentUser._id,
    performedByName: normalize(currentUser.name),
    role: normalize(currentUser.role),
    remarks: normalize(remarks),
    performedAt,
  });
};

const coerceQueryResult = async (result) => {
  if (result && typeof result.lean === "function") {
    return await result.lean();
  }

  return result;
};

const assertConsolidationDatabaseConnected = () => {
  if (
    mongoose.connection.readyState !== 1 ||
    !mongoose.connection.db
  ) {
    throw new AppError(
      "MongoDB must be connected before consolidated findings can be changed.",
      503
    );
  }
};

const assertConsolidationDatabaseIntegrity = async () => {
  assertConsolidationDatabaseConnected();

  try {
    await ConsolidatedFindingSourceClaim.collection.createIndex(
      { sourceFinding: 1 },
      { unique: true }
    );

    const indexes =
      await ConsolidatedFindingSourceClaim.collection.indexes();
    const hasUniqueSourceIndex =
      indexes.some(
        (index) =>
          index.key?.sourceFinding === 1 &&
          index.unique === true
      );

    if (!hasUniqueSourceIndex) {
      throw new AppError(
        "The unique source-finding claim index is unavailable.",
        503
      );
    }

    const [consolidatedFindings, claims] =
      await Promise.all([
        coerceQueryResult(
          ConsolidatedFinding.find(
            {},
          "_id scheduledAudit sourceFindings"
          )
        ),
        coerceQueryResult(
          ConsolidatedFindingSourceClaim.find(
            { status: "active" },
          "sourceFinding consolidatedFinding scheduledAudit"
          )
        ),
      ]);

    const claimsBySource = new Map(
      claims.map((claim) => [
        String(claim.sourceFinding),
        {
        consolidatedFinding: String(claim.consolidatedFinding),
        scheduledAudit: String(claim.scheduledAudit),
        },
      ])
    );
    const groupsById = new Map(
      consolidatedFindings.map((finding) => [
        String(finding._id),
        {
        scheduledAudit: String(finding.scheduledAudit),
        sourceFindings: new Set(
          (finding.sourceFindings || []).map(String)
        ),
        },
      ])
    );

    for (const [groupId, group] of groupsById) {
      for (const sourceId of group.sourceFindings) {
        const claim = claimsBySource.get(sourceId);
        if (
        claim?.consolidatedFinding !== groupId ||
        claim.scheduledAudit !== group.scheduledAudit
        ) {
        throw new AppError(
          "Existing consolidated findings require source-claim backfilling before writes can continue.",
            503
          );
        }
      }
    }

    for (const [sourceId, claim] of claimsBySource) {
      if (
        !groupsById
          .get(claim.consolidatedFinding)
          ?.sourceFindings.has(sourceId) ||
        groupsById.get(claim.consolidatedFinding)?.scheduledAudit !==
          claim.scheduledAudit
      ) {
        throw new AppError(
          "An inconsistent source claim must be reconciled before consolidated writes can continue.",
          503
        );
      }
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      `Unable to verify consolidated-finding database integrity: ${error.message}`,
      503
    );
  }
};

const runConsolidationTransaction = async (operation) => {
  await assertConsolidationDatabaseIntegrity();

  let session;

  try {
    session = await mongoose.startSession();
    return await session.withTransaction(operation);
  } catch (error) {
    if (error?.code === 11000 || error?.codeName === "DuplicateKey") {
      throw new AppError(
        "One or more source findings are already assigned to another consolidated finding.",
        409
      );
    }

    if (
      error?.codeName === "IllegalOperation" ||
      /transaction numbers are only allowed|does not support transactions/i.test(
        error?.message || ""
      )
    ) {
      throw new AppError(
        "Consolidated finding changes require a transaction-capable MongoDB replica set.",
        503
      );
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const claimSourceFinding = async (
  scheduledAuditId,
  consolidatedFindingId,
  sourceFindingId,
  session = null
) => {
  try {
    await ConsolidatedFindingSourceClaim.findOneAndUpdate(
      {
        sourceFinding: sourceFindingId,
      },
      {
        scheduledAudit: scheduledAuditId,
        consolidatedFinding: consolidatedFindingId,
        sourceFinding: sourceFindingId,
        status: "active",
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
        session,
      }
    );
  } catch (error) {
    if (
      error?.code === 11000 ||
      error?.codeName === "DuplicateKey"
    ) {
      throw new AppError(
        "One or more source findings are already assigned to another active consolidated finding.",
        409
      );
    }

    throw error;
  }
};

const replaceSourceClaims = async (
  scheduledAuditId,
  consolidatedFindingId,
  sourceIds,
  previousSourceIds = [],
  session = null
) => {
  const normalizedPrevious =
    previousSourceIds.map(String);
  const normalizedNext =
    sourceIds.map(String);

  const removed =
    normalizedPrevious.filter(
      (id) => !normalizedNext.includes(id)
    );

  const added =
    normalizedNext.filter(
      (id) => !normalizedPrevious.includes(id)
    );

  if (removed.length > 0) {
    await ConsolidatedFindingSourceClaim.deleteMany(
      {
        scheduledAudit: scheduledAuditId,
        consolidatedFinding: consolidatedFindingId,
        sourceFinding: {
          $in: removed,
        },
      },
      {
        session,
      }
    );
  }

  for (const sourceId of added) {
    await claimSourceFinding(
      scheduledAuditId,
      consolidatedFindingId,
      sourceId,
      session
    );
  }
};

const validateAndLoadSourceFindings = async (
  scheduledAuditId,
  sourceIds,
  skipFindingId = null
) => {
  const findingsQuery =
    await AuditFinding.find({
      _id: {
        $in: sourceIds,
      },
      scheduledAudit: scheduledAuditId,
    });

  const findings =
    await coerceQueryResult(findingsQuery);

  if (findings.length !== sourceIds.length) {
    throw new AppError(
      "One or more selected source findings do not belong to this Scheduled Audit.",
      400
    );
  }

  const invalidStatuses =
    findings.filter(
      (finding) =>
        finding.status !== "SUBMITTED" ||
        ![
          "submitted_to_lead",
          "returned_to_auditor",
        ].includes(
          finding.workflowStatus
        )
    );

  if (invalidStatuses.length > 0) {
    throw new AppError(
      "Only submitted findings currently awaiting lead review can be consolidated.",
      400
    );
  }

  const overlappingQuery =
    await ConsolidatedFinding.find({
      scheduledAudit: scheduledAuditId,
      sourceFindings: {
        $in: sourceIds,
      },
      _id: {
        $ne: skipFindingId,
      },
    });

  const overlapping =
    await coerceQueryResult(overlappingQuery);

  if (overlapping.length > 0) {
    throw new AppError(
      "One or more source findings are already assigned to another active consolidated finding.",
      409
    );
  }

  return findings;
};

export const listEligibleSubmittedFindingsForAudit = async (
  scheduledAuditId,
  currentUser
) => {
  const audit =
    await assertLeadAuditorForScheduledAudit(
      scheduledAuditId,
      currentUser
    );

  assertScheduledAuditWorkflowMode(
    audit,
    "consolidated",
    "Consolidated findings are not enabled for this Scheduled Audit."
  );

  const activeSourceClaimsQuery =
    await ConsolidatedFinding.find(
      {
        scheduledAudit: audit._id,
      },
      "sourceFindings"
    );

  const activeSourceClaims =
    await coerceQueryResult(
      activeSourceClaimsQuery
    );

  const excludedIds = new Set();

  for (const claim of activeSourceClaims) {
    for (const sourceId of claim.sourceFindings || []) {
      excludedIds.add(String(sourceId));
    }
  }

  const result = await AuditFinding.find({
    scheduledAudit: audit._id,
    status: "SUBMITTED",
    workflowStatus: {
      $in: [
        "submitted_to_lead",
        "returned_to_auditor",
      ],
    },
    _id: {
      $nin: [...excludedIds].map(
        (id) => new mongoose.Types.ObjectId(id)
      ),
    },
  });

  if (Array.isArray(result)) {
    return result.sort((a, b) =>
      new Date(b.createdAt || b.updatedAt || 0) -
      new Date(a.createdAt || a.updatedAt || 0)
    );
  }

  return result
    .sort({ createdAt: -1 })
    .populate("submittedBy", "name email role");
};

export const listEligibleConsolidatedFindingsForAudit =
  listEligibleSubmittedFindingsForAudit;

export const listConsolidatedFindingsForAudit = async (
  scheduledAuditId,
  currentUser
) => {
  const audit = await assertLeadAuditorForScheduledAudit(
    scheduledAuditId,
    currentUser
  );

  assertScheduledAuditWorkflowMode(
    audit,
    "consolidated",
    "Consolidated findings are not enabled for this Scheduled Audit."
  );

  const result = await ConsolidatedFinding.find({
    scheduledAudit: scheduledAuditId,
  });

  if (Array.isArray(result)) {
    return result.sort((a, b) =>
      new Date(b.createdAt || b.updatedAt || 0) -
      new Date(a.createdAt || a.updatedAt || 0)
    );
  }

  return result
    .sort({ createdAt: -1 })
    .populate("sourceFindings")
    .populate("submittedBy", "name email role");
};

export const createConsolidatedFinding = async (
  scheduledAuditId,
  payload = {},
  currentUser
) => {
  assertConsolidationDatabaseConnected();

  const audit =
    await assertLeadAuditorForScheduledAudit(
      scheduledAuditId,
      currentUser
    );

  assertScheduledAuditWorkflowMode(
    audit,
    "consolidated",
    "Consolidated findings are not enabled for this Scheduled Audit."
  );

  const sourceFindingIds =
    normalizeSourceFindingIds(
      payload.sourceFindings
    );

  const title = normalize(payload.title);
  if (!title) {
    throw new AppError(
      "Consolidated finding title is required.",
      400
    );
  }

  const classification =
    normalizeClassification(
      payload.classification
    );

  if (!classification) {
    throw new AppError(
      "Classification must be NC or OFI.",
      400
    );
  }

  await validateAndLoadSourceFindings(
    audit._id,
    sourceFindingIds
  );

  const now = new Date();
  let record;
  await runConsolidationTransaction(async (session) => {
    await acquireConsolidatedAuditWriteBarrier(audit._id, session);
    const created = await ConsolidatedFinding.create(
      [
        {
          auditPlan: audit.auditPlan,
          scheduledAudit: audit._id,
          iqaNumber: audit.iqaNumber,
          prakalpa: audit.prakalpa,
          location: audit.location,
          sublocation: audit.sublocation || "",
          auditCoordinator: audit.auditCoordinator,
          leadAuditor: audit.leadAuditor,
          submittedBy: currentUser._id,
          submittedByName: normalize(currentUser.name),
          title,
          description: normalize(payload.description),
          supportingNotes: normalize(payload.supportingNotes),
          classification,
          status: "DRAFT",
          workflowStatus: "consolidated_draft",
          sourceFindings: sourceFindingIds,
          workflowHistory: [
            {
              action: "created",
              fromStatus: "",
              toStatus: "consolidated_draft",
              performedBy: currentUser._id,
              performedByName: normalize(currentUser.name),
              role: normalize(currentUser.role),
              remarks: normalize(payload.remarks || ""),
              performedAt: now,
            },
          ],
        },
      ],
      { session }
    );

    record = created[0];

    await replaceSourceClaims(
      audit._id,
      record._id,
      sourceFindingIds,
      [],
      session
    );
  });

  return record;
};

export const getConsolidatedFindingById = async (
  id,
  currentUser
) => {
  assertObjectId(id, "Consolidated Finding");

  const finding =
    await ConsolidatedFinding.findById(id)
      .populate("sourceFindings")
      .populate("submittedBy", "name email role");

  if (!finding) {
    throw new AppError(
      "Consolidated finding not found.",
      404
    );
  }

  const audit = await assertLeadAuditorForScheduledAudit(
    finding.scheduledAudit,
    currentUser
  );

  assertScheduledAuditWorkflowMode(
    audit,
    "consolidated",
    "Consolidated findings are not enabled for this Scheduled Audit."
  );

  return finding;
};

export const updateConsolidatedFindingDraft = async (
  id,
  payload = {},
  currentUser
) => {
  assertConsolidationDatabaseConnected();

  assertObjectId(id, "Consolidated Finding");

  const finding =
    await ConsolidatedFinding.findById(id);

  if (!finding) {
    throw new AppError(
      "Consolidated finding not found.",
      404
    );
  }

  const audit = await assertLeadAuditorForScheduledAudit(
    finding.scheduledAudit,
    currentUser
  );

  assertScheduledAuditWorkflowMode(
    audit,
    "consolidated",
    "Consolidated findings are not enabled for this Scheduled Audit."
  );

  if (
    finding.status !== "DRAFT" ||
    finding.workflowStatus !== "consolidated_draft"
  ) {
    throw new AppError(
      "Only a draft consolidated finding can be edited.",
      409
    );
  }

  if (payload.title !== undefined) {
    const title = normalize(payload.title);
    if (!title) {
      throw new AppError(
        "Consolidated finding title is required.",
        400
      );
    }
    finding.title = title;
  }

  if (payload.description !== undefined) {
    finding.description = normalize(payload.description);
  }

  if (payload.supportingNotes !== undefined) {
    finding.supportingNotes = normalize(payload.supportingNotes);
  }

  if (payload.classification !== undefined) {
    const classification =
      normalizeClassification(payload.classification);

    if (!classification) {
      throw new AppError(
        "Classification must be NC or OFI.",
        400
      );
    }

    finding.classification = classification;
  }

  const previousSourceIds =
    [...finding.sourceFindings].map(String);

  if (payload.sourceFindings !== undefined) {
    const sourceIds =
      normalizeSourceFindingIds(payload.sourceFindings);

    await validateAndLoadSourceFindings(
      finding.scheduledAudit,
      sourceIds,
      finding._id
    );

    finding.sourceFindings = sourceIds;
  }

  if (
    !finding.title ||
    !finding.classification ||
    finding.sourceFindings.length === 0
  ) {
    throw new AppError(
      "A consolidated finding must include a title, classification and at least one source finding.",
      400
    );
  }

  appendConsolidatedHistory(
    finding,
    {
      action: "updated",
      fromStatus: finding.workflowStatus,
      toStatus: finding.workflowStatus,
      currentUser,
      remarks: payload.remarks || "",
    }
  );

  await runConsolidationTransaction(async (session) => {
    await acquireConsolidatedAuditWriteBarrier(finding.scheduledAudit, session);
    await replaceSourceClaims(
      finding.scheduledAudit,
      finding._id,
      finding.sourceFindings,
      previousSourceIds,
      session
    );

    if (typeof finding.$session === "function") {
      finding.$session(session);
    }

    await finding.save();
  });

  return finding;
};

export const submitConsolidatedFinding = async (
  id,
  currentUser,
  extraData = {}
) => {
  assertConsolidationDatabaseConnected();

  assertObjectId(id, "Consolidated Finding");

  const finding =
    await ConsolidatedFinding.findById(id);

  if (!finding) {
    throw new AppError(
      "Consolidated finding not found.",
      404
    );
  }

  const audit = await assertLeadAuditorForScheduledAudit(
    finding.scheduledAudit,
    currentUser
  );

  assertScheduledAuditWorkflowMode(
    audit,
    "consolidated",
    "Consolidated findings are not enabled for this Scheduled Audit."
  );

  if (
    finding.status !== "DRAFT" ||
    finding.workflowStatus !== "consolidated_draft"
  ) {
    throw new AppError(
      "Only a draft consolidated finding can be submitted.",
      409
    );
  }

  if (
    !finding.title ||
    !finding.classification ||
    finding.sourceFindings.length === 0
  ) {
    throw new AppError(
      "A consolidated finding must include a title, classification and at least one source finding before submission.",
      400
    );
  }

  const confirmed = handoverConfirmation([finding]);
  return runConsolidationTransaction(async (session) => {
    const lockedAudit = await acquireConsolidatedAuditWriteBarrier(finding.scheduledAudit, session);
    assertAssignedLeadAuditor(lockedAudit, currentUser);
    const current = await ConsolidatedFinding.findById(id).session(session);
    if (!current || current.status !== "DRAFT" || current.workflowStatus !== "consolidated_draft" || handoverConfirmation([current]) !== confirmed) {
      throw new AppError("The confirmed finding changed. Refresh and confirm again.", 409);
    }
    const groups = await ConsolidatedFinding.find({ scheduledAudit: audit._id }).session(session);
    const ungrouped = await AuditFinding.find({ scheduledAudit: audit._id, status: "SUBMITTED",
      workflowStatus: { $in: ["submitted_to_lead", "returned_to_auditor"] },
      _id: { $nin: groups.flatMap(group => group.sourceFindings) } }).session(session).select("_id");
    if (ungrouped.length) throw new AppError("Consolidate all currently submitted Auditor findings before sending.", 409);
    const now = new Date();
    current.status = "SUBMITTED";
    current.workflowStatus = "submitted_to_coordinator";
    current.submittedAt = now;
    current.submittedToCoordinatorAt = now;
    appendConsolidatedHistory(current, { action: "submitted_to_coordinator", fromStatus: "consolidated_draft",
      toStatus: "submitted_to_coordinator", currentUser, remarks: normalize(extraData.remarks || ""), performedAt: now });
    await current.save({ session });
    return current;
  });
};


export const submitAllConsolidatedFindingsForAudit = async (
  scheduledAuditId,
  currentUser,
  extraData = {}
) => {
  const request = normalizeHandoverRequest(extraData);
  assertConsolidationDatabaseConnected();

  const audit = await assertLeadAuditorForScheduledAudit(
    scheduledAuditId,
    currentUser
  );

  assertScheduledAuditWorkflowMode(
    audit,
    "consolidated",
    "Consolidated findings are not enabled for this Scheduled Audit."
  );

  return runConsolidationTransaction(async (session) => {
    const lockedAudit = await acquireConsolidatedAuditWriteBarrier(audit._id, session);
    assertAssignedLeadAuditor(lockedAudit, currentUser);
    const handover = await LeadBatchSubmission.findOne({ scheduledAudit: audit._id }).session(session);
    const previous = [handover?.initialHandover, ...(handover?.supplementalHandovers || [])].find(h => h?.requestId === request.requestId);
    if (previous) {
      if (!sameMembership(previous.findingIds, request.findingIds) || previous.confirmation !== request.confirmation) throw new AppError("This request ID was already used for different findings.", 409);
      return ConsolidatedFinding.find({ scheduledAudit: audit._id, _id: { $in: previous.findingIds } }).session(session);
    }
    const allFindings = await ConsolidatedFinding.find({
      scheduledAudit: audit._id,
    }).session(session);

    const findings = allFindings.filter(f => f.status === "DRAFT" && f.workflowStatus === "consolidated_draft");
    if (!sameMembership(findings.map(f => f._id), request.findingIds) || handoverConfirmation(findings) !== request.confirmation) {
      throw new AppError("The confirmed finding set changed. Refresh, review and confirm again.", 409);
    }
    if (findings.length === 0) {
      throw new AppError(
        "Create consolidated findings before submitting this IQA.",
        400
      );
    }

    if (findings.some(
      (finding) =>
        !finding.title?.trim() ||
        !["NC", "OFI"].includes(finding.classification) ||
        !Array.isArray(finding.sourceFindings) ||
        finding.sourceFindings.length === 0
    )) {
      throw new AppError(
        "Every consolidated finding must have a title, NC/OFI classification, and at least one source.",
        400
      );
    }

    const unassigned = await AuditFinding.find({
      scheduledAudit: audit._id,
      status: "SUBMITTED",
      workflowStatus: {
        $in: ["submitted_to_lead", "returned_to_auditor"],
      },
      _id: {
        $nin: allFindings.flatMap((finding) => finding.sourceFindings),
      },
    }).session(session).select("_id");

    if (unassigned.length > 0) {
      throw new AppError(
        "Consolidate all currently submitted Auditor findings before sending this IQA.",
        409
      );
    }

    const now = new Date();
    const entry = { ...request, leadAuditor: currentUser._id, submittedAt: now,
      approvedCount: findings.length, discardedCount: 0 };
    const record = handover?.toObject ? handover.toObject() : { ...(handover || {}) };
    const next = handover ? { ...record, supplementalHandovers: [...(record.supplementalHandovers || []), entry] }
      : { scheduledAudit: audit._id, leadAuditor: currentUser._id, approvedCount: findings.length,
          discardedCount: 0, submittedAt: now, initialHandover: entry };
    assertHandoverCapacity(next);

    for (const finding of findings) {
      finding.status = "SUBMITTED";
      finding.workflowStatus = "submitted_to_coordinator";
      finding.submittedAt = now;
      finding.submittedToCoordinatorAt = now;

      appendConsolidatedHistory(finding, {
        action: "submitted_to_coordinator",
        fromStatus: "consolidated_draft",
        toStatus: "submitted_to_coordinator",
        currentUser,
        remarks: normalize(extraData.remarks || ""),
        performedAt: now,
      });

      await finding.save({ session });
    }

    if (handover) await LeadBatchSubmission.updateOne({ _id: handover._id }, { $push: { supplementalHandovers: entry } }, { session, runValidators: true });
    else await LeadBatchSubmission.create([next], { session });
    return findings;
  });
};

export const submitConsolidatedFindingToCoordinator =
  submitConsolidatedFinding;

export const listConsolidatedFindings =
  listConsolidatedFindingsForAudit;

export const getConsolidatedFinding =
  getConsolidatedFindingById;

export const updateConsolidatedFinding =
  updateConsolidatedFindingDraft;

export const submitConsolidatedFindingForCoordinator =
  submitConsolidatedFinding;


/*
 * ==========================================================
 * AUDIT FINDING JURISDICTION
 * ==========================================================
 *
 * super_admin / admin
 *   -> all findings
 *
 * auditor
 *   -> ONLY findings submitted by their authenticated User ID
 *
 * auditor with Lead Auditor assignment
 *   -> May review findings belonging to ScheduledAudits where
 *      they are currently assigned as Lead Auditor
 *
 * Audit Coordinator access is intentionally NOT granted here.
 * Coordinator visibility begins only after the Lead Auditor
 * submits approved findings to the Coordinator.
 */


export const buildAuditFindingJurisdiction =
  async (currentUser, scope = "mine") => {
    if (!currentUser) {
      throw new AppError(
        "Authentication required.",
        401
      );
    }

    const role =
      normalize(currentUser.role);

    const userName =
      normalize(currentUser.name);


    /*
     * Application-wide administrative visibility.
     */
    if (
      role === "super_admin" ||
      role === "admin"
    ) {
      return {};
    }


    /*
     * Auditor ownership is based on immutable User ObjectId.
     *
     * This is stronger than matching by display name.
     */
    if (role === "auditor" && scope !== "review") {
      return {
        submittedBy:
          currentUser._id,
      };
    }


    /*
     * Review jurisdiction is audit-specific.
     * A regular Auditor can review only audits where they
     * are the current assigned Lead Auditor.
     */
    if (role === "auditor" && scope === "review") {
      if (!userName) {
        throw new AppError(
          "Your account does not have a valid Lead Auditor name.",
          403
        );
      }

      const audits =
        await ScheduledAudit.find(
          {
            leadAuditor:
              userName,
          },
          "_id"
        ).lean();

      const auditIds =
        audits.map(
          (audit) =>
            audit._id
        );

      /*
       * Empty $in intentionally returns zero records.
       */
      return {
        scheduledAudit: {
          $in: auditIds,
        },
      };
    }


    /*
     * Audit Coordinator jurisdiction.
     *
     * IMPORTANT:
     * Assignment is derived from ScheduledAudit.auditCoordinator.
     * The copied AuditFinding.auditCoordinator field is historical
     * metadata and is NOT an authorization source.
     *
     * Coordinators may only see findings that the Lead Auditor
     * has explicitly forwarded to the Coordinator.
     */
    if (role === "audit_coordinator") {
      if (!userName) {
        throw new AppError(
          "Your account does not have a valid Audit Coordinator name.",
          403
        );
      }

      const audits =
        await ScheduledAudit.find(
          {
            auditCoordinator:
              userName,
          },
          "_id"
        ).lean();

      const auditIds =
        audits.map(
          (audit) =>
            audit._id
        );

      return {
        scheduledAudit: {
          $in: auditIds,
        },

        workflowStatus:
          "submitted_to_coordinator",
      };
    }


    throw new AppError(
      "Your role does not have access to Auditor findings.",
      403
    );
  };


/*
 * List findings inside the authenticated user's jurisdiction.
 */
export const getAuditFindings =
  async (currentUser, scope = "mine") => {
    const filter =
      await buildAuditFindingJurisdiction(
        currentUser,
        scope
      );

    return await AuditFinding.find(
      filter
    )
      .sort({
        createdAt: -1,
      })
      .populate(
        "submittedBy",
        "name email role"
      );
  };


/*
 * Fetch one finding using the SAME jurisdiction filter.
 *
 * This intentionally returns 404 when a record exists but is
 * outside the user's jurisdiction, preventing ID enumeration.
 */
export const getAuditFindingById =
  async (
    id,
    currentUser
  ) => {
    assertObjectId(
      id,
      "Audit Finding"
    );

    const role = normalize(currentUser?.role);

    const ownFilter =
      await buildAuditFindingJurisdiction(
        currentUser,
        "mine"
      );

    let finding =
      await AuditFinding.findOne({
        _id: id,
        ...ownFilter,
      }).populate(
        "submittedBy",
        "name email role"
      );

    // An Auditor may also read findings for audits where
    // they are the currently assigned Lead Auditor.
    // This does not grant access to other audits.
    if (!finding && role === "auditor") {
      const reviewFilter =
        await buildAuditFindingJurisdiction(
          currentUser,
          "review"
        );

      finding =
        await AuditFinding.findOne({
          _id: id,
          ...reviewFilter,
        }).populate(
          "submittedBy",
          "name email role"
        );
    }

    if (!finding) {
      throw new AppError(
        "Audit Finding not found.",
        404
      );
    }

    return finding;
  };


/*
 * ==========================================================
 * PHASE 4B.2
 * AUDITOR <-> LEAD AUDITOR WORKFLOW
 * ==========================================================
 */


/*
 * Resolve the authoritative ScheduledAudit for a finding.
 */
const getFindingScheduledAudit =
  async (finding) => {
    const audit =
      await ScheduledAudit.findById(
        finding.scheduledAudit
      );

    if (!audit) {
      throw new AppError(
        "The Scheduled Audit for this finding no longer exists.",
        409
      );
    }

    getScheduledAuditWorkflowMode(audit);

    return audit;
  };


/*
 * Verify that the authenticated user is the CURRENT Lead Auditor
 * assigned on ScheduledAudit.
 *
 * Never trust finding.leadAuditor for authorization because that
 * field is only a historical snapshot.
 */
const assertAssignedLeadAuditor =
  (
    audit,
    currentUser
  ) => {
    if (!currentUser) {
      throw new AppError(
        "Authentication required.",
        401
      );
    }

    if (
      normalize(currentUser.role) !==
      "auditor"
    ) {
      throw new AppError(
        "Only the assigned Lead Auditor can perform this action.",
        403
      );
    }

    const userName =
      normalize(currentUser.name);

    const assignedLead =
      normalize(audit.leadAuditor);

    if (
      !userName ||
      !assignedLead ||
      userName !== assignedLead
    ) {
      throw new AppError(
        "You are not the assigned Lead Auditor for this audit.",
        403
      );
    }
  };


/*
 * Verify the finding belongs to the authenticated Auditor AND
 * that the Auditor is still assigned to the ScheduledAudit.
 */
const assertFindingOwnerAuditor =
  (
    finding,
    audit,
    currentUser
  ) => {
    assertAssignedAuditor(
      audit,
      currentUser
    );

    if (
      String(finding.submittedBy) !==
      String(currentUser._id)
    ) {
      throw new AppError(
        "You are not the Auditor who submitted this finding.",
        403
      );
    }
  };


const appendWorkflowHistory =
  (
    finding,
    {
      action,
      fromStatus,
      toStatus,
      currentUser,
      remarks = "",
      performedAt = new Date(),
    }
  ) => {
    finding.workflowHistory.push({
      action,
      fromStatus,
      toStatus,

      performedBy:
        currentUser._id,

      performedByName:
        normalize(
          currentUser.name
        ),

      role:
        normalize(
          currentUser.role
        ),

      remarks:
        normalize(remarks),

      performedAt,
    });
  };


/*
 * ==========================================================
 * LEAD AUDITOR -> RETURN TO AUDITOR
 *
 * Legal transition:
 *
 * submitted_to_lead
 *        ->
 * returned_to_auditor
 * ==========================================================
 */
export const returnFindingToAuditor =
  async (
    id,
    data = {},
    currentUser
  ) => {
    assertObjectId(
      id,
      "Audit Finding"
    );

    const finding =
      await AuditFinding.findById(id);

    if (!finding) {
      throw new AppError(
        "Audit Finding not found.",
        404
      );
    }

    const audit =
      await getFindingScheduledAudit(
        finding
      );

    assertAssignedLeadAuditor(
      audit,
      currentUser
    );

    assertScheduledAuditWorkflowMode(
      audit,
      "legacy",
      "Returning original findings is disabled for consolidated-workflow audits."
    );

    if (
      finding.workflowStatus !==
      "submitted_to_lead"
    ) {
      throw new AppError(
        "Only findings awaiting Lead Auditor review can be returned.",
        409
      );
    }

    const remarks =
      normalize(data.remarks);

    if (!remarks) {
      throw new AppError(
        "Return remarks are required.",
        400
      );
    }

    const now = new Date();
    const fromStatus =
      finding.workflowStatus;

    finding.workflowStatus =
      "returned_to_auditor";

    finding.leadReviewRemarks =
      remarks;

    finding.leadReviewedAt =
      now;

    appendWorkflowHistory(
      finding,
      {
        action:
          "returned_to_auditor",

        fromStatus,

        toStatus:
          "returned_to_auditor",

        currentUser,
        remarks,
        performedAt:
          now,
      }
    );

    await finding.save();

    return finding;
  };


/*
 * ==========================================================
 * AUDITOR -> EDIT RETURNED FINDING + RESUBMIT
 *
 * Legal transition:
 *
 * returned_to_auditor
 *        ->
 * submitted_to_lead
 *
 * This endpoint intentionally performs correction and resubmission
 * atomically. A returned finding cannot be arbitrarily edited while
 * it is under Lead review.
 * ==========================================================
 */
export const resubmitFindingToLead =
  async (
    id,
    data = {},
    currentUser
  ) => {
    assertObjectId(
      id,
      "Audit Finding"
    );

    const finding =
      await AuditFinding.findById(id);

    if (!finding) {
      throw new AppError(
        "Audit Finding not found.",
        404
      );
    }

    const audit =
      await getFindingScheduledAudit(
        finding
      );

    assertFindingOwnerAuditor(
      finding,
      audit,
      currentUser
    );

    if (
      finding.workflowStatus !==
      "returned_to_auditor"
    ) {
      throw new AppError(
        "Only a finding returned by the Lead Auditor can be corrected and resubmitted.",
        409
      );
    }

    /*
     * The Lead assignment may have changed since the original
     * submission. Require a current Lead before resubmission.
     */
    if (
      !normalize(
        audit.leadAuditor
      )
    ) {
      throw new AppError(
        "A Lead Auditor is not currently assigned to this audit.",
        409
      );
    }

    /*
     * Merge current values with supplied corrections, then run
     * the SAME validation used during initial submission.
     */
    const candidate = {
      auditArea:
        data.auditArea !== undefined
          ? data.auditArea
          : finding.auditArea,

      findings:
        data.findings !== undefined
          ? data.findings
          : finding.findings,

      severity:
        data.severity !== undefined
          ? data.severity
          : finding.severity,

      visitDate:
        data.visitDate !== undefined
          ? data.visitDate
          : finding.visitDate,

      visitTime:
        data.visitTime !== undefined
          ? data.visitTime
          : finding.visitTime,
    };

    const validated =
      validateFindingPayload(
        candidate,
        audit
      );

    finding.auditArea =
      validated.auditArea;

    finding.findings =
      validated.findings;

    finding.severity =
      validated.severity;

    finding.visitDate =
      validated.visitDate;

    finding.visitTime =
      validated.visitTime;


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

      finding.proofFiles =
        data.proofFiles
          .map(normalize)
          .filter(Boolean);
    }


    if (
      data.hasChecklist !== undefined
    ) {
      finding.hasChecklist =
        Boolean(
          data.hasChecklist
        );
    }


    const now = new Date();
    const fromStatus =
      finding.workflowStatus;

    finding.workflowStatus =
      "submitted_to_lead";

    finding.submittedToLeadAt =
      now;

    /*
     * Keep previous Lead remarks in workflowHistory.
     * Clear the active review fields because this is a fresh
     * Lead review cycle.
     */
    finding.leadReviewRemarks =
      "";

    finding.leadReviewedAt =
      null;


    appendWorkflowHistory(
      finding,
      {
        action:
          "resubmitted_to_lead",

        fromStatus,

        toStatus:
          "submitted_to_lead",

        currentUser,

        remarks:
          normalize(
            data.remarks
          ),

        performedAt:
          now,
      }
    );

    const session = await mongoose.startSession();
    try {
      return await session.withTransaction(async () => {
        const lockedAudit = await acquireFindingSubmissionBarrier(audit._id, session);
        assertAssignedAuditor(lockedAudit, currentUser);
        assertScheduledAuditOpenForFindings(lockedAudit);
        const current = await AuditFinding.findById(finding._id).session(session);
        if (!current || current.workflowStatus !== "returned_to_auditor" || String(current.submittedBy) !== String(currentUser._id)) {
          throw new AppError("Finding changed. Refresh and retry.", 409);
        }
        // Carry over only this validated correction; never replace a concurrent review.
        for (const key of ["findings", "description", "severity", "classification", "auditArea", "visitDate", "visitTime", "proofFiles", "hasChecklist", "workflowStatus", "submittedToLeadAt", "leadReviewRemarks", "leadReviewedAt", "workflowHistory"]) {
          if (finding[key] !== undefined) current[key] = finding[key];
        }
        await current.save({ session });
        return current;
      });
    } finally { await session.endSession(); }
  };


/*
 * ==========================================================
 * LEAD AUDITOR -> APPROVE AND SEND TO COORDINATOR
 *
 * User-facing operation is intentionally one action.
 *
 * submitted_to_lead
 *        ->
 * submitted_to_coordinator
 *
 * workflowHistory records Lead approval explicitly.
 * ==========================================================
 */
export const saveLeadEditableCopy = async (id, data = {}, currentUser) => {
  assertObjectId(id, "Audit Finding");
  const finding = await AuditFinding.findById(id);
  if (!finding) throw new AppError("Audit Finding not found.", 404);
  const audit = await getFindingScheduledAudit(finding);
  assertAssignedLeadAuditor(audit, currentUser);
  assertScheduledAuditWorkflowMode(audit, "legacy", "Direct Lead edit is disabled for consolidated-workflow audits.");
  if (finding.workflowStatus !== "submitted_to_lead") {
    throw new AppError("Only findings awaiting Lead review can be edited.", 409);
  }
  const findings = typeof data.findings === "string" ? data.findings.trim() : "";
  const severity = data.severity;
  if (!findings || findings.length > 10000 || !["open_for_improvement", "non_conformance"].includes(severity)) {
    throw new AppError("Valid finding text and severity are required.", 400);
  }
  const revision = Number(data.revision);
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new AppError("A valid review revision is required.", 400);
  }
  // Atomic conditional update prevents concurrent edits and post-approval changes.
  const updated = await AuditFinding.findOneAndUpdate(
    {
      _id: finding._id,
      workflowStatus: "submitted_to_lead",
      $or: revision === 0
        ? [{ "leadEditedCopy.revision": 0 }, { "leadEditedCopy.revision": { $exists: false } }]
        : [{ "leadEditedCopy.revision": revision }],
    },
    {
      $set: {
        "leadEditedCopy.findings": findings,
        "leadEditedCopy.severity": severity,
        "leadEditedCopy.editedAt": new Date(),
        "leadEditedCopy.editedBy": currentUser._id,
        "leadEditedCopy.revision": revision + 1,
      },
      $push: { workflowHistory: {
        action: "lead_review_copy_edited",
        fromStatus: "submitted_to_lead",
        toStatus: "submitted_to_lead",
        performedBy: currentUser._id,
        performedByName: normalize(currentUser.name),
        role: normalize(currentUser.role),
        remarks: "Lead Auditor updated the separate review copy.",
        performedAt: new Date(),
      } },
    },
    { new: true, runValidators: true }
  );
  if (!updated) throw new AppError("The finding changed. Refresh and retry.", 409);
  return updated;
};

// Individual decisions are review-only. Only the batch endpoint transfers ownership.
export const approveFindingAndSubmitToCoordinator = async (id, data = {}, currentUser) => {
  assertObjectId(id, "Audit Finding");
  const finding = await AuditFinding.findById(id);
  if (!finding) throw new AppError("Audit Finding not found.", 404);
  const audit = await getFindingScheduledAudit(finding);
  assertAssignedLeadAuditor(audit, currentUser);
  assertScheduledAuditWorkflowMode(audit, "legacy", "Legacy Lead review only.");
  if (finding.workflowStatus !== "submitted_to_lead") throw new AppError("Finding already decided or transferred.", 409);
  const decision = data.decision === "discard" ? "discarded_by_lead" : "approved_by_lead";
  const now = new Date();
  const updated = await AuditFinding.findOneAndUpdate(
    { _id: finding._id, workflowStatus: "submitted_to_lead",
      $or: finding.leadEditedCopy?.revision
        ? [{ "leadEditedCopy.revision": finding.leadEditedCopy.revision }]
        : [{ "leadEditedCopy.revision": 0 }, { "leadEditedCopy.revision": { $exists: false } }] },
    { $set: { workflowStatus: decision, leadReviewRemarks: normalize(data.remarks), leadReviewedAt: now },
      $push: { workflowHistory: { action: decision, fromStatus: "submitted_to_lead", toStatus: decision,
        performedBy: currentUser._id, performedByName: normalize(currentUser.name), role: normalize(currentUser.role),
        remarks: normalize(data.remarks), performedAt: now } } },
    { new: true, runValidators: true }
  );
  if (!updated) throw new AppError("Finding changed. Refresh and retry.", 409);
  return updated;
};

export const getLeadBatchStatus = async (scheduledAuditId, currentUser) => {
  assertObjectId(scheduledAuditId, "Scheduled Audit");
  const audit = await ScheduledAudit.findById(scheduledAuditId);
  if (!audit) throw new AppError("Scheduled Audit not found.", 404);
  assertAssignedLeadAuditor(audit, currentUser);
  assertScheduledAuditWorkflowMode(audit, "legacy", "Legacy Lead batch only.");
  const [handover, findings, submissions, closure] = await Promise.all([
    LeadBatchSubmission.findOne({ scheduledAudit: audit._id }).lean(),
    AuditFinding.find({ scheduledAudit: audit._id }).lean(),
    AuditorSubmission.find({ scheduledAudit: audit._id }).lean(),
    CoordinatorBatchClosure.exists({ scheduledAudit: audit._id }),
  ]);
  const available = selectUnforwardedLegacyFindings(findings, handover);
  const assigned = [...new Set((audit.auditors || []).map(normalize).filter(Boolean))];
  const submittedNames = new Set(submissions.map(s => normalize(s.auditorName)));
  return { submitted: Boolean(handover), submittedAt: handover?.submittedAt || null,
    finalized: Boolean(closure), handoverCount: handover ? 1 + (handover.supplementalHandovers?.length || 0) : 0,
    findingIds: available.map(f => String(f._id)).sort(), confirmation: handoverConfirmation(available),
    missingAuditors: assigned.filter(name => !submittedNames.has(name)),
    pending: available.filter(f => !["approved_by_lead", "discarded_by_lead"].includes(f.workflowStatus)).length,
    approved: available.filter(f => f.workflowStatus === "approved_by_lead").length,
    discarded: available.filter(f => f.workflowStatus === "discarded_by_lead").length };
};

export const submitLeadBatchToCoordinator = async (scheduledAuditId, currentUser, data = {}) => {
  assertObjectId(scheduledAuditId, "Scheduled Audit");
  const request = normalizeHandoverRequest(data);
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const audit = await acquireFindingSubmissionBarrier(scheduledAuditId, session);
      assertAssignedLeadAuditor(audit, currentUser);
      assertScheduledAuditWorkflowMode(audit, "legacy", "Legacy Lead batch only.");
      assertScheduledAuditOpenForFindings(audit);
      if (!normalize(audit.auditCoordinator)) throw new AppError("Audit Coordinator is not assigned.", 409);
      const handover = await LeadBatchSubmission.findOne({ scheduledAudit: audit._id }).session(session);
      const previous = [handover?.initialHandover, ...(handover?.supplementalHandovers || [])]
        .find(h => h?.requestId === request.requestId);
      if (previous) {
        if (!sameMembership(previous.findingIds, request.findingIds) || previous.confirmation !== request.confirmation) {
          throw new AppError("This request ID was already used for different findings.", 409);
        }
        return { approved: previous.approvedCount, discarded: previous.discardedCount, submittedAt: previous.submittedAt, alreadySubmitted: true };
      }
      const allFindings = await AuditFinding.find({ scheduledAudit: audit._id }).session(session);
      const findings = selectUnforwardedLegacyFindings(allFindings, handover);
      if ((!findings.length && handover) || !sameMembership(findings.map(f => f._id), request.findingIds) || handoverConfirmation(findings) !== request.confirmation) {
        throw new AppError("The confirmed finding set changed. Refresh, review and confirm again.", 409);
      }
      if (findings.some(f => !["approved_by_lead", "discarded_by_lead"].includes(f.workflowStatus))) {
        throw new AppError("All currently submitted findings must be approved or discarded before handover.", 409);
      }
      const now = new Date();
      const entry = { ...request, leadAuditor: currentUser._id, submittedAt: now,
        approvedCount: findings.filter(f => f.workflowStatus === "approved_by_lead").length,
        discardedCount: findings.filter(f => f.workflowStatus === "discarded_by_lead").length };
      const record = handover?.toObject ? handover.toObject() : { ...(handover || {}) };
      const next = handover
        ? { ...record, supplementalHandovers: [...(record.supplementalHandovers || []), entry] }
        : { scheduledAudit: audit._id, leadAuditor: currentUser._id, approvedCount: entry.approvedCount,
            discardedCount: entry.discardedCount, submittedAt: now, initialHandover: entry };
      assertHandoverCapacity(next);
      for (const finding of findings) {
        if (finding.workflowStatus === "discarded_by_lead") continue;
        finding.workflowStatus = "submitted_to_coordinator";
        finding.submittedToCoordinatorAt = now;
        finding.auditCoordinator = normalize(audit.auditCoordinator);
        finding.workflowHistory.push({ action: "lead_batch_submitted", fromStatus: "approved_by_lead",
          toStatus: "submitted_to_coordinator", performedBy: currentUser._id,
          performedByName: normalize(currentUser.name), role: normalize(currentUser.role), performedAt: now });
        await finding.save({ session });
      }
      if (handover) {
        await LeadBatchSubmission.updateOne({ _id: handover._id }, { $push: { supplementalHandovers: entry } }, { session, runValidators: true });
      } else {
        await LeadBatchSubmission.create([next], { session });
      }
      return { approved: entry.approvedCount, discarded: entry.discardedCount, submittedAt: now, alreadySubmitted: false };
    });
  } finally { await session.endSession(); }
};

const getCoordinatorFindingContext = async (id, currentUser) => {
  assertObjectId(id, "Audit Finding");
  if (!currentUser || currentUser.role !== "audit_coordinator")
    throw new AppError("Audit Coordinator access required.", 403);
  const finding = await AuditFinding.findById(id);
  if (!finding) throw new AppError("Finding not found.", 404);
  const audit = await getFindingScheduledAudit(finding);
  assertScheduledAuditWorkflowMode(audit, "legacy", "This action is only for individual finding audits.");
  if (!normalize(audit.auditCoordinator) || normalize(audit.auditCoordinator) !== normalize(currentUser.name))
    throw new AppError("This audit is outside your Coordinator assignment.", 403);
  if (audit.status !== "completed")
    throw new AppError("Mark the scheduled IQA Completed before reviewing final IQRs.", 409);
  return { finding, audit };
};

export const listCoordinatorAuditFindings = async (scheduledAuditId, currentUser) => {
  assertObjectId(scheduledAuditId, "Scheduled Audit");
  if (!currentUser || currentUser.role !== "audit_coordinator")
    throw new AppError("Audit Coordinator access required.", 403);
  const audit = await ScheduledAudit.findById(scheduledAuditId);
  if (!audit) throw new AppError("Scheduled Audit not found.", 404);
  if (normalize(audit.auditCoordinator) !== normalize(currentUser.name))
    throw new AppError("This audit is outside your Coordinator assignment.", 403);
  assertScheduledAuditWorkflowMode(audit, "legacy", "This IQA uses the separate consolidated workflow.");
  const findings = await AuditFinding.find({
    scheduledAudit: audit._id,
    workflowStatus: { $in: ["submitted_to_coordinator", "converted_to_report", "discarded_by_coordinator"] },
  }).populate("submittedBy", "name email").sort({ createdAt: 1 });
  return { audit: { _id:audit._id, iqaNumber:audit.iqaNumber, prakalpa:audit.prakalpa, leadAuditor:audit.leadAuditor, location:audit.location, status:audit.status }, findings };
};

// Compact counts for Scheduled Audits. Only audits assigned to the authenticated Coordinator.
export const listCoordinatorFindingSummaries = async (currentUser) => {
  if (!currentUser || currentUser.role !== "audit_coordinator")
    throw new AppError("Audit Coordinator access required.", 403);
  const audits = await ScheduledAudit.find({ auditCoordinator: normalize(currentUser.name) })
    .select("_id workflowMode").lean();
  const legacyIds = audits.filter(a => !a.workflowMode || a.workflowMode === "legacy").map(a => a._id);
  if (!legacyIds.length) return [];
  const records = await AuditFinding.aggregate([
    { $match: { scheduledAudit: { $in: legacyIds }, workflowStatus: { $in: ["submitted_to_coordinator", "converted_to_report", "discarded_by_coordinator"] } } },
    { $group: { _id: "$scheduledAudit", received: { $sum: 1 }, awaitingReview: { $sum: { $cond: [ { $and: [ { $eq: ["$workflowStatus", "submitted_to_coordinator"] }, { $eq: [ { $ifNull: ["$coordinatorCompletedAt", null] }, null ] } ] }, 1, 0 ] } } } },
  ]);
  return records.map(r => ({ scheduledAuditId: String(r._id), received: r.received, awaitingReview: r.awaitingReview }));
};

export const reviewCoordinatorFinding = async (id, payload, currentUser) => {
  const { finding } = await getCoordinatorFindingContext(id, currentUser);
  if (finding.workflowStatus !== "submitted_to_coordinator" || finding.coordinatorCompletedAt)
    throw new AppError("This finding is finalized and cannot be edited.", 409);
  if (!payload || typeof payload !== "object" || Array.isArray(payload))
    throw new AppError("Invalid Coordinator review.", 400);
  const findings = normalize(payload.findings);
  const severity = normalize(payload.severity);
  if (!findings || findings.length > 20000 || !["non_conformance", "open_for_improvement"].includes(severity))
    throw new AppError("Provide finding text and an NC/OFI classification.", 400);
  const now = new Date();
  const updated = await AuditFinding.findOneAndUpdate(
    { _id:finding._id, workflowStatus:"submitted_to_coordinator", coordinatorCompletedAt:null },
    { $set: { coordinatorEditedCopy: { findings, severity, editedAt:now, editedBy:currentUser._id, revision:(finding.coordinatorEditedCopy?.revision || 0)+1 }, coordinatorVerifiedAt:now },
      $push: { workflowHistory: { action:"coordinator_reviewed", fromStatus:finding.workflowStatus, toStatus:finding.workflowStatus, performedBy:currentUser._id, performedByName:currentUser.name, role:currentUser.role, remarks:"Coordinator verified final text and classification", performedAt:now } } },
    { new:true, runValidators:true }
  );
  if (!updated) throw new AppError("Finding changed; refresh and retry.",409);
  return updated;
};

export const completeCoordinatorFinding = async (id, currentUser) => {
  const { finding } = await getCoordinatorFindingContext(id, currentUser);
  if (finding.coordinatorCompletedAt) return finding;
  if (finding.workflowStatus !== "submitted_to_coordinator" || !finding.coordinatorVerifiedAt || !normalize(finding.coordinatorEditedCopy?.findings))
    throw new AppError("Save and verify the final finding before marking it completed.",409);
  const now = new Date();
  const updated = await AuditFinding.findOneAndUpdate(
    { _id:finding._id, workflowStatus:"submitted_to_coordinator", coordinatorVerifiedAt: { $ne:null }, coordinatorCompletedAt:null },
    { $set: { coordinatorCompletedAt:now, coordinatorCompletedBy:currentUser._id },
      $push: { workflowHistory: { action:"coordinator_completed", fromStatus:finding.workflowStatus, toStatus:finding.workflowStatus, performedBy:currentUser._id, performedByName:currentUser.name, role:currentUser.role, remarks:"Finding completed for IQR generation", performedAt:now } } },
    { new:true, runValidators:true }
  );
  if (!updated) throw new AppError("Finding changed; refresh and retry.",409);
  return updated;
};

export const discardCoordinatorFinding = async (id, currentUser) => {
  const { finding } = await getCoordinatorFindingContext(id, currentUser);
  if (finding.workflowStatus !== "submitted_to_coordinator" || finding.coordinatorCompletedAt)
    throw new AppError("This finding is already finalized.",409);
  const now = new Date();
  const updated = await AuditFinding.findOneAndUpdate(
    {_id: finding._id, workflowStatus:"submitted_to_coordinator", coordinatorCompletedAt:null},
    {$set:{workflowStatus:"discarded_by_coordinator", coordinatorDiscardedAt:now},
     $push:{workflowHistory:{action:"discarded_by_coordinator",fromStatus:"submitted_to_coordinator",toStatus:"discarded_by_coordinator",performedBy:currentUser._id,performedByName:normalize(currentUser.name),role:normalize(currentUser.role),performedAt:now}}},
    {new:true,runValidators:true});
  if (!updated) throw new AppError("Finding changed. Refresh and retry.",409);
  return updated;
};

export const generateCoordinatorBatchReports = async (scheduledAuditId,currentUser) => {
  assertObjectId(scheduledAuditId,"Scheduled Audit");
  const audit = await ScheduledAudit.findById(scheduledAuditId);
  if (!audit) throw new AppError("Scheduled Audit not found.",404);
  if (!currentUser || currentUser.role !== "audit_coordinator" || normalize(audit.auditCoordinator) !== normalize(currentUser.name))
    throw new AppError("Coordinator assignment required.",403);
  assertScheduledAuditWorkflowMode(audit,"legacy","This IQA uses the consolidated workflow.");
  if (audit.status !== "completed") throw new AppError("Mark IQA Completed first.",409);
  if (!await LeadBatchSubmission.exists({scheduledAudit:audit._id}))
    throw new AppError("Wait for the Lead Auditor batch handover.",409);
  const existingClosure = await CoordinatorBatchClosure.findOne({scheduledAudit:audit._id});
  if (existingClosure) return {closed:true,generated:0,discarded:existingClosure.discardedCount,alreadyClosed:true};
  const findings = await AuditFinding.find({scheduledAudit:audit._id}).sort({createdAt:1});
  if (findings.some(f => !["submitted_to_coordinator","converted_to_report","discarded_by_coordinator","discarded_by_lead"].includes(f.workflowStatus)))
    throw new AppError("Unresolved Lead or Auditor findings prevent report generation.",409);
  const approved = findings.filter(f=>["submitted_to_coordinator","converted_to_report"].includes(f.workflowStatus));
  if (approved.some(f=>f.workflowStatus === "submitted_to_coordinator" && (!f.coordinatorCompletedAt || !f.coordinatorVerifiedAt || !normalize(f.coordinatorEditedCopy?.findings))))
    throw new AppError("Approve or discard every finding before generating reports.",409);
  let generated=0;
  // Each report uses the existing unique sourceFinding index. A failed batch is recoverable.
  for (const finding of approved) {
    await convertFindingToReport(finding._id,currentUser);
    if (finding.workflowStatus !== "converted_to_report") generated++;
  }
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(async () => {
      const lockedAudit = await acquireFindingSubmissionBarrier(audit._id, session);
      if (lockedAudit.status !== "completed" || normalize(lockedAudit.auditCoordinator) !== normalize(currentUser.name)) {
        throw new AppError("Coordinator assignment or audit status changed. Refresh and retry.", 409);
      }
      const finalFindings = await AuditFinding.find({ scheduledAudit: audit._id }).session(session);
      if (finalFindings.some(f => !["converted_to_report", "discarded_by_coordinator", "discarded_by_lead"].includes(f.workflowStatus))) {
        throw new AppError("Some findings remain unresolved; retry generation.", 409);
      }
      const finalApproved = finalFindings.filter(f => f.workflowStatus === "converted_to_report");
      const reported = await Report.countDocuments({ scheduledAudit: audit._id, sourceFinding: { $in: finalApproved.map(f => f._id) } }).session(session);
      if (reported !== finalApproved.length) throw new AppError("Missing official IQR record; retry batch generation.", 409);
      const discarded = finalFindings.length - finalApproved.length;
      await CoordinatorBatchClosure.create([{ scheduledAudit: audit._id, coordinator: currentUser._id,
        generatedCount: finalApproved.length, discardedCount: discarded }], { session });
      return { closed: true, generated, discarded, alreadyClosed: false };
    });
  } finally { await session.endSession(); }
};

/*
 * ==========================================================
 * AUDIT COORDINATOR -> GENERATE OFFICIAL IQR
 *
 * Authoritative transition:
 *
 * submitted_to_coordinator
 *          ->
 * converted_to_report
 *
 * The Report is built only from persisted AuditFinding and
 * ScheduledAudit data. Client supplied report metadata is not
 * trusted.
 *
 * Report.sourceFinding provides database-level idempotency.
 * ==========================================================
 */
export const convertFindingToReport =
  async (
    id,
    currentUser
  ) => {
    assertObjectId(
      id,
      "Audit Finding"
    );

    if (!currentUser) {
      throw new AppError(
        "Authentication required.",
        401
      );
    }

    if (
      currentUser.role !==
      "audit_coordinator"
    ) {
      throw new AppError(
        "Only the assigned Audit Coordinator can generate an IQR from a finding.",
        403
      );
    }

    const finding =
      await AuditFinding.findById(id);

    if (!finding) {
      throw new AppError(
        "Audit Finding not found.",
        404
      );
    }

    const audit =
      await getFindingScheduledAudit(
        finding
      );

    assertScheduledAuditWorkflowMode(
      audit,
      "legacy",
      "Direct original-finding report conversion is disabled for consolidated-workflow audits."
    );

    /*
     * ScheduledAudit remains the authoritative assignment
     * source. Never authorize using copied finding metadata.
     */
    const assignedCoordinator =
      normalize(
        audit.auditCoordinator
      );

    const currentUserName =
      normalize(
        currentUser.name
      );

    if (
      !assignedCoordinator ||
      !currentUserName ||
      assignedCoordinator !==
        currentUserName
    ) {
      throw new AppError(
        "This audit is outside your Audit Coordinator jurisdiction.",
        403
      );
    }

    if (audit.status !== "completed") {
      throw new AppError("The IQA must be marked Completed before IQR generation.", 409);
    }

    /*
     * Idempotency check before workflow-state validation.
     *
     * If this finding has already generated an official report,
     * return the same report instead of creating another IQR.
     */
    const existingReport =
      await Report.findOne({
        sourceFinding:
          finding._id,
      });

    if (existingReport) {
      return existingReport;
    }

    if (
      finding.workflowStatus !==
      "submitted_to_coordinator"
    ) {
      throw new AppError(
        "Only findings submitted to the Audit Coordinator can be converted into an IQR.",
        409
      );
    }

    if (!finding.coordinatorCompletedAt || !finding.coordinatorVerifiedAt || !normalize(finding.coordinatorEditedCopy?.findings)) {
      throw new AppError("The Coordinator must verify and complete this individual finding first.", 409);
    }

    // Enforce all Coordinator decisions before any official IQR, including direct API calls.
    const unresolved = await AuditFinding.exists({ scheduledAudit: audit._id,
      workflowStatus: "submitted_to_coordinator", coordinatorCompletedAt: null });
    if (unresolved) throw new AppError("Approve or discard every Coordinator finding before generating IQRs.",409);


    /*
     * IQA number belongs to the ScheduledAudit.
     */
    const iqaNumber =
      normalize(
        audit.iqaNumber
      );

    if (!iqaNumber) {
      throw new AppError(
        "The scheduled audit does not have a valid IQA number.",
        409
      );
    }

    /*
     * Generate the next GLOBAL IQR number for the current year.
     *
     * Existing production data uses:
     *
     *   IQR-YYYY-NNNN
     *
     * Example:
     *   IQR-2026-0009
     *   IQR-2026-0010
     *
     * IQR numbering is independent of IQA numbering.
     */
    const currentYear =
      new Date().getFullYear();

    const iqrPattern =
      new RegExp(
        `^IQR-${currentYear}-(\\d{4})$`
      );

    const yearReports =
      await Report.find(
        {
          iqrNumber: new RegExp(
            `^IQR-${currentYear}-`
          ),
        },
        "iqrNumber"
      ).lean();

    let maxSequence = 0;

    for (
      const existing of
      yearReports
    ) {
      const value =
        normalize(
          existing.iqrNumber
        );

      const match =
        value.match(
          iqrPattern
        );

      if (!match) {
        continue;
      }

      const sequence =
        Number.parseInt(
          match[1],
          10
        );

      if (
        Number.isFinite(sequence) &&
        sequence > maxSequence
      ) {
        maxSequence =
          sequence;
      }
    }

    let nextSequence =
      maxSequence + 1;

    let iqrNumber;

    /*
     * Report.iqrNumber has a unique database constraint.
     *
     * This loop also protects against an existing number that
     * may not have been returned by the initial year query.
     */
    while (true) {
      iqrNumber =
        `IQR-${currentYear}-${String(
          nextSequence
        ).padStart(4, "0")}`;

      const collision =
        await Report.exists({
          iqrNumber,
        });

      if (!collision) {
        break;
      }

      nextSequence += 1;
    }

    const now =
      new Date();

    /*
     * Build official report metadata exclusively from persisted
     * workflow records.
     */
    const reportData = {
      iqrNumber,

      sourceFinding:
        finding._id,

      auditPlan:
        audit.auditPlan,

      scheduledAudit:
        audit._id,

      iqaNumber,

      prakalpa:
        audit.prakalpa,

      location:
        audit.location,

      sublocation:
        audit.sublocation || "",

      auditCoordinator:
        assignedCoordinator,

      auditors:
        Array.isArray(
          audit.auditors
        )
          ? audit.auditors
          : [],

      leadAuditor:
        normalize(
          audit.leadAuditor
        ),

      auditAreas:
        Array.isArray(
          audit.auditAreas
        )
          ? audit.auditAreas
          : [],

      purpose:
        audit.purpose || "",

      prakalphaPramukh:
        audit.prakalphaPramukh || "",

      visitDate:
        finding.visitDate,

      visitTime:
        finding.visitTime,

      severity:
        finding.coordinatorEditedCopy?.severity || (finding.leadEditedCopy?.severity || finding.severity),

      findings:
        finding.coordinatorEditedCopy?.findings || (finding.leadEditedCopy?.findings || finding.findings),

      proofFiles: [
        ...(Array.isArray(finding.proofFiles) ? finding.proofFiles : []),
        ...(Array.isArray(finding.leadEvidenceFiles) ? finding.leadEvidenceFiles : []),
      ].filter(token => !(finding.evidenceReviews || []).some(r => r.token === token && (r.leadDropped || r.coordinatorDropped))),

      hasChecklist:
        Boolean(
          finding.hasChecklist
        ),

      status:
        "open",

      workflowStatus:
        "sent_to_prakalpa",

      sentToPrakalpaAt:
        now,

      reportCreatedOn:
        now,
    };

    /*
     * Required-value guard before writing an official report.
     */
    const requiredValues = [
      ["auditPlan", reportData.auditPlan],
      ["scheduledAudit", reportData.scheduledAudit],
      ["prakalpa", reportData.prakalpa],
      ["location", reportData.location],
      ["visitDate", reportData.visitDate],
      ["visitTime", reportData.visitTime],
      ["severity", reportData.severity],
      ["findings", reportData.findings],
    ];

    for (
      const [
        field,
        value,
      ] of requiredValues
    ) {
      if (
        value === undefined ||
        value === null ||
        value === ""
      ) {
        throw new AppError(
          `Cannot generate IQR because ${field} is missing from the authoritative audit workflow data.`,
          409
        );
      }
    }

    let report;

    try {
      report =
        await Report.create(
          reportData
        );
    } catch (error) {

      /*
       * A concurrent request may have passed the first
       * idempotency check. The unique sourceFinding index is the
       * final authority.
       */
      if (
        error &&
        error.code === 11000
      ) {
        const concurrentReport =
          await Report.findOne({
            sourceFinding:
              finding._id,
          });

        if (concurrentReport) {
          return concurrentReport;
        }
      }

      throw error;
    }

    /*
     * Update the pre-IQR workflow only after Report creation
     * succeeds.
     */
    const fromStatus =
      finding.workflowStatus;

    finding.workflowStatus =
      "converted_to_report";

    finding.convertedToReportAt =
      now;

    finding.report =
      report._id;

    appendWorkflowHistory(
      finding,
      {
        action:
          "converted_to_report",

        fromStatus,

        toStatus:
          "converted_to_report",

        currentUser,

        remarks:
          `Official IQR ${report.iqrNumber} generated.`,

        performedAt:
          now,
      }
    );

    await finding.save();

    return report;
  };


/*
 * Consolidated findings visible to the assigned Audit Coordinator.
 * Authorization is derived from ScheduledAudit, never client input.
 */

/*
 * Coordinator classification review.
 *
 * The Lead Auditor's original classification is immutable here.
 * The Coordinator's decision is stored separately.
 * This endpoint does not generate an official IQR.
 */

export const editCoordinatorConsolidatedFinding = async (
  id,
  updates,
  currentUser
) => {
  assertObjectId(id, "Consolidated Finding");

  if (
    !currentUser ||
    currentUser.role !== "audit_coordinator" ||
    !normalize(currentUser.name) ||
    !currentUser._id
  ) {
    throw new AppError("Only an Audit Coordinator can edit findings.", 403);
  }

  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new AppError("Valid finding updates are required.", 400);
  }

  const allowed = ["title", "description", "supportingNotes"];
  const keys = Object.keys(updates);

  if (
    !keys.length ||
    keys.some((key) => !allowed.includes(key)) ||
    keys.some((key) => typeof updates[key] !== "string")
  ) {
    throw new AppError(
      "Only title, description and supporting notes can be edited.",
      400
    );
  }

  if (
    ("title" in updates && !normalize(updates.title)) ||
    ("description" in updates && !normalize(updates.description))
  ) {
    throw new AppError("Title and description cannot be empty.", 400);
  }

  const session = await mongoose.startSession();

  try {
    return await session.withTransaction(async () => {
      const record = await ConsolidatedFinding.findById(id).session(session);
      if (!record) {
        throw new AppError("Consolidated Finding not found.", 404);
      }

      const audit = await ScheduledAudit.findById(
        record.scheduledAudit
      ).session(session);

      if (!audit) {
        throw new AppError("Scheduled Audit not found.", 404);
      }

      assertScheduledAuditWorkflowMode(
        audit,
        "consolidated",
        "Coordinator editing requires a consolidated-workflow audit."
      );

      if (
        !normalize(audit.auditCoordinator) ||
        normalize(audit.auditCoordinator) !== normalize(currentUser.name)
      ) {
        throw new AppError(
          "This audit is outside your Audit Coordinator jurisdiction.",
          403
        );
      }

      await acquireConsolidatedAuditWriteBarrier(audit._id, session);

      if (
        record.status !== "SUBMITTED" ||
        record.workflowStatus !== "submitted_to_coordinator"
      ) {
        throw new AppError(
          "Only submitted findings awaiting review can be edited.",
          409
        );
      }

      const existingReport = await Report.exists({
        sourceConsolidatedFinding: record._id,
      }).session(session);

      if (existingReport) {
        throw new AppError(
          "Finding cannot be edited after IQR generation.",
          409
        );
      }

      for (const key of keys) {
        record[key] = normalize(updates[key]);
      }

      record.coordinatorClassification = null;
      record.coordinatorClassificationReviewedAt = null;
      record.coordinatorClassificationReviewedBy = null;

      appendConsolidatedHistory(record, {
        action: "coordinator_finding_edit",
        fromStatus: record.workflowStatus,
        toStatus: record.workflowStatus,
        currentUser,
        remarks: "Coordinator edited finding details; previous confirmation invalidated.",
        performedAt: new Date(),
      });

      await record.save({ session });
      return record;
    });
  } finally {
    await session.endSession();
  }
};


export const reviewCoordinatorConsolidatedClassification = async (
  id,
  classification,
  currentUser
) => {
  assertObjectId(id, "Consolidated Finding");

  if (
    !currentUser ||
    currentUser.role !== "audit_coordinator" ||
    !normalize(currentUser.name) ||
    !currentUser._id
  ) {
    throw new AppError(
      "Only an authenticated Audit Coordinator can review classification.",
      403
    );
  }

  if (classification !== "NC" && classification !== "OFI") {
    throw new AppError(
      "Classification must be NC or OFI.",
      400
    );
  }

  let session;

  try {
    session = await mongoose.startSession();

    const finding = await session.withTransaction(async () => {
      const record = await ConsolidatedFinding.findById(id)
        .session(session);

      if (!record) {
        throw new AppError("Consolidated Finding not found.", 404);
      }

      const audit = await ScheduledAudit.findById(
        record.scheduledAudit
      ).session(session);

      if (!audit) {
        throw new AppError("Scheduled Audit not found.", 404);
      }

      assertScheduledAuditWorkflowMode(
        audit,
        "consolidated",
        "Coordinator classification review requires a consolidated-workflow audit."
      );

      if (
        !normalize(audit.auditCoordinator) ||
        normalize(audit.auditCoordinator) !== normalize(currentUser.name)
      ) {
        throw new AppError(
          "This audit is outside your Audit Coordinator jurisdiction.",
          403
        );
      }

      await acquireConsolidatedAuditWriteBarrier(
        audit._id,
        session
      );

      if (
        record.status !== "SUBMITTED" ||
        record.workflowStatus !== "submitted_to_coordinator"
      ) {
        throw new AppError(
          "Only submitted consolidated findings can be reviewed.",
          409
        );
      }

      const existingReport = await Report.exists({
        sourceConsolidatedFinding: record._id,
      }).session(session);

      if (existingReport) {
        throw new AppError(
          "Classification cannot change after an official IQR is generated.",
          409
        );
      }

      const previous =
        record.coordinatorClassification || record.classification;

      const now = new Date();

      record.coordinatorClassification = classification;
      record.coordinatorClassificationReviewedAt = now;
      record.coordinatorClassificationReviewedBy = currentUser._id;

      appendConsolidatedHistory(record, {
        action: "coordinator_classification_review",
        fromStatus: record.workflowStatus,
        toStatus: record.workflowStatus,
        currentUser,
        remarks:
          `Coordinator classification: ${previous || "Unclassified"} -> ${classification}. ` +
          `Lead Auditor original classification: ${record.classification || "Unclassified"}.`,
        performedAt: now,
      });

      await record.save({ session });

      return record;
    });

    return finding;
  } catch (error) {
    if (
      error?.codeName === "IllegalOperation" ||
      /transaction numbers are only allowed|does not support transactions/i.test(
        error?.message || ""
      )
    ) {
      throw new AppError(
        "Coordinator classification review requires a transaction-capable MongoDB replica set.",
        503
      );
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};


/*
 * Generate one official IQR from a submitted consolidated finding.
 *
 * Authorization is derived from ScheduledAudit.
 * Report uniqueness is enforced by sourceConsolidatedFinding.
 * Classification and report creation share a transaction.
 */
export const convertConsolidatedFindingToReport = async (
  id,
  currentUser
) => {
  assertObjectId(id, "Consolidated Finding");

  if (
    !currentUser ||
    currentUser.role !== "audit_coordinator" ||
    !normalize(currentUser.name)
  ) {
    throw new AppError(
      "Only an authenticated Audit Coordinator can generate an IQR.",
      403
    );
  }

  const MAX_ATTEMPTS = 8;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      let generatedReport;

      await session.withTransaction(async () => {
        const finding = await ConsolidatedFinding.findById(id)
          .session(session);

        if (!finding) {
          throw new AppError(
            "Consolidated Finding not found.",
            404
          );
        }

        const audit = await ScheduledAudit.findById(
          finding.scheduledAudit
        ).session(session);

        if (!audit) {
          throw new AppError(
            "Scheduled Audit not found.",
            404
          );
        }

        assertScheduledAuditWorkflowMode(
          audit,
          "consolidated",
          "Consolidated IQR generation requires a consolidated-workflow audit."
        );

        if (
          !normalize(audit.auditCoordinator) ||
          normalize(audit.auditCoordinator) !==
            normalize(currentUser.name)
        ) {
          throw new AppError(
            "This audit is outside your Audit Coordinator jurisdiction.",
            403
          );
        }

        const existing = await Report.findOne({
          sourceConsolidatedFinding: finding._id,
        }).session(session);

        if (existing) {
          generatedReport = existing;
          return;
        }

        await acquireConsolidatedAuditWriteBarrier(
          audit._id,
          session
        );

        if (
          finding.status !== "SUBMITTED" ||
          finding.workflowStatus !== "submitted_to_coordinator"
        ) {
          throw new AppError(
            "Only submitted consolidated findings can generate an IQR.",
            409
          );
        }

        const iqaNumber = normalize(audit.iqaNumber);

        if (!iqaNumber) {
          throw new AppError(
            "Scheduled Audit has no valid IQA number.",
            409
          );
        }

        const classification =
          finding.coordinatorClassification;

        if (
          classification !== "NC" &&
          classification !== "OFI"
        ) {
          throw new AppError(
            "The Coordinator must save an NC or OFI classification before generating an IQR.",
            409
          );
        }

        const sourceIds = finding.sourceFindings || [];

        if (!sourceIds.length) {
          throw new AppError(
            "Consolidated finding has no original Auditor submissions.",
            409
          );
        }

        const sources = await AuditFinding.find({
          _id: { $in: sourceIds },
          scheduledAudit: audit._id,
        }).session(session);

        if (sources.length !== sourceIds.length) {
          throw new AppError(
            "Some original Auditor submissions could not be verified.",
            409
          );
        }

        sources.sort((a, b) => {
          const dateDifference =
            new Date(a.visitDate).getTime() -
            new Date(b.visitDate).getTime();

          if (dateDifference !== 0) return dateDifference;

          return String(a._id).localeCompare(String(b._id));
        });

        const firstSource = sources[0];

        if (
          !firstSource?.visitDate ||
          !normalize(firstSource.visitTime)
        ) {
          throw new AppError(
            "Original Auditor visit date or time is missing.",
            409
          );
        }

        const evidence = [
          ...new Set(
            sources.flatMap((source) =>
              [
                ...(Array.isArray(source.proofFiles) ? source.proofFiles : []),
                ...(Array.isArray(source.leadEvidenceFiles) ? source.leadEvidenceFiles : []),
              ]
            )
          ),
        ];

        const reportText = [
          normalize(finding.title),
          normalize(finding.description),
          normalize(finding.supportingNotes),
        ].filter(Boolean).join("\n\n");

        if (!reportText) {
          throw new AppError(
            "Consolidated finding has no reportable description.",
            409
          );
        }

        const now = new Date();
        const currentYear = now.getFullYear();

        const yearReports = await Report.find(
          {
            iqrNumber: new RegExp(
              `^IQR-${currentYear}-`
            ),
          },
          "iqrNumber"
        ).session(session).lean();

        const pattern = new RegExp(
          `^IQR-${currentYear}-(\\d{4})$`
        );

        let maxSequence = 0;

        for (const report of yearReports) {
          const match = normalize(report.iqrNumber).match(pattern);

          if (match) {
            maxSequence = Math.max(
              maxSequence,
              Number.parseInt(match[1], 10)
            );
          }
        }

        /*
         * A bounded outer retry handles concurrent number collisions.
         * The unique iqrNumber index remains authoritative.
         */
        const sequence = maxSequence + 1 + attempt;

        const iqrNumber =
          `IQR-${currentYear}-${String(sequence).padStart(4, "0")}`;

        const reportData = {
          iqrNumber,
          sourceConsolidatedFinding: finding._id,
          auditPlan: audit.auditPlan,
          scheduledAudit: audit._id,
          iqaNumber,
          prakalpa: audit.prakalpa,
          location: audit.location,
          sublocation: audit.sublocation || "",
          auditCoordinator: normalize(audit.auditCoordinator),
          auditors: audit.auditors || [],
          leadAuditor: normalize(audit.leadAuditor),
          auditAreas: audit.auditAreas || [],
          purpose: audit.purpose || "",
          prakalphaPramukh: audit.prakalphaPramukh || "",
          visitDate: firstSource.visitDate,
          visitTime: firstSource.visitTime,
          severity:
            classification === "NC"
              ? "non_conformance"
              : "open_for_improvement",
          findings: reportText,
          proofFiles: evidence,
          hasChecklist: sources.some(
            (source) => Boolean(source.hasChecklist)
          ),
          status: "open",
          workflowStatus: "coordinator_generated",
          reportCreatedOn: now,
        };

        const requiredValues = [
          ["auditPlan", reportData.auditPlan],
          ["scheduledAudit", reportData.scheduledAudit],
          ["prakalpa", reportData.prakalpa],
          ["location", reportData.location],
          ["visitDate", reportData.visitDate],
          ["visitTime", reportData.visitTime],
          ["severity", reportData.severity],
          ["findings", reportData.findings],
        ];

        for (const [field, value] of requiredValues) {
          if (
            value === undefined ||
            value === null ||
            value === ""
          ) {
            throw new AppError(
              `Cannot generate IQR because ${field} is missing.`,
              409
            );
          }
        }

        const [report] = await Report.create(
          [reportData],
          { session }
        );

        const fromStatus = finding.workflowStatus;

        finding.workflowStatus = "converted_to_report";
        finding.convertedToReportAt = now;
        finding.report = report._id;

        appendConsolidatedHistory(finding, {
          action: "converted_to_report",
          fromStatus,
          toStatus: "converted_to_report",
          currentUser,
          remarks:
            `Official IQR ${report.iqrNumber} generated.`,
          performedAt: now,
        });

        await finding.save({ session });

        generatedReport = report;
      });

      return generatedReport;
    } catch (error) {
      const duplicateKey =
        error?.code === 11000 ||
        error?.codeName === "DuplicateKey";

      const retryableConflict =
        error?.hasErrorLabel?.("TransientTransactionError") ||
        error?.code === 112;

      if (duplicateKey) {
        const existing = await Report.findOne({
          sourceConsolidatedFinding: id,
        });

        if (existing) {
          return existing;
        }
      }

      if (
        (duplicateKey || retryableConflict) &&
        attempt + 1 < MAX_ATTEMPTS
      ) {
        continue;
      }

      if (
        error?.codeName === "IllegalOperation" ||
        /transaction numbers are only allowed|does not support transactions/i.test(
          error?.message || ""
        )
      ) {
        throw new AppError(
          "Consolidated IQR generation requires a transaction-capable MongoDB replica set.",
          503
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  throw new AppError(
    "Unable to allocate a unique IQR number after multiple attempts. Please retry.",
    409
  );
};

export const listCoordinatorConsolidatedInbox = async (currentUser) => {
  if (
    !currentUser ||
    currentUser.role !== "audit_coordinator" ||
    !normalize(currentUser.name)
  ) {
    throw new AppError(
      "Only an authenticated Audit Coordinator may view this inbox.",
      403
    );
  }

  const audits = await ScheduledAudit.find({
    workflowMode: "consolidated",
    auditCoordinator: normalize(currentUser.name),
  }).select("_id iqaNumber prakalpa location").lean();

  if (!audits.length) return [];

  const findings = await ConsolidatedFinding.find({
    scheduledAudit: { $in: audits.map((audit) => audit._id) },
    status: "SUBMITTED",
    workflowStatus: {
      $in: ["submitted_to_coordinator", "converted_to_report"],
    },
  })
    .populate({
      path: "sourceFindings",
      select: "findings description severity auditArea visitDate visitTime proofFiles submittedByName",
    })
    .sort({ submittedToCoordinatorAt: -1, createdAt: -1 })
    .lean();

  const auditById = new Map(
    audits.map((audit) => [String(audit._id), audit])
  );

  const reports = await Report.find({
    sourceConsolidatedFinding: {
      $in: findings.map((finding) => finding._id),
    },
  })
    .select("_id iqrNumber workflowStatus severity sourceConsolidatedFinding")
    .lean();

  const reportByFindingId = new Map(
    reports.map((report) => [
      String(report.sourceConsolidatedFinding),
      report,
    ])
  );

  return findings.map((finding) => ({
    ...finding,
    audit: auditById.get(String(finding.scheduledAudit)) || null,
    officialReport: reportByFindingId.get(String(finding._id)) || null,
  }));
};
