import mongoose from "mongoose";

import AuditFinding from "../models/AuditFinding.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import Report from "../models/Report.js";
import AppError from "../utils/AppError.js";


const normalize = (value) =>
  String(value || "").trim();


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

  if (!assignedAuditors.includes(userName)) {
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

    const finding =
      await AuditFinding.create({
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

        workflowStatus:
          "submitted_to_lead",

        submittedToLeadAt:
          now,

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
      });

    return finding;
  };


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
 * lead_auditor
 *   -> ONLY findings belonging to ScheduledAudits where they
 *      are currently assigned as Lead Auditor
 *
 * Audit Coordinator access is intentionally NOT granted here.
 * Coordinator visibility begins only after the Lead Auditor
 * submits approved findings to the Coordinator.
 */


export const buildAuditFindingJurisdiction =
  async (currentUser) => {
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
    if (role === "auditor") {
      return {
        submittedBy:
          currentUser._id,
      };
    }


    /*
     * Lead jurisdiction must be derived from ScheduledAudit,
     * never from the copied leadAuditor field on AuditFinding.
     */
    if (role === "lead_auditor") {
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
  async (currentUser) => {
    const filter =
      await buildAuditFindingJurisdiction(
        currentUser
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

    const filter =
      await buildAuditFindingJurisdiction(
        currentUser
      );

    const finding =
      await AuditFinding.findOne({
        _id: id,
        ...filter,
      }).populate(
        "submittedBy",
        "name email role"
      );

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
      "lead_auditor"
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

    await finding.save();

    return finding;
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
export const approveFindingAndSubmitToCoordinator =
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

    if (
      finding.workflowStatus !==
      "submitted_to_lead"
    ) {
      throw new AppError(
        "Only findings awaiting Lead Auditor review can be approved.",
        409
      );
    }

    /*
     * Coordinator assignment is authoritative on ScheduledAudit.
     */
    const coordinator =
      normalize(
        audit.auditCoordinator
      );

    if (!coordinator) {
      throw new AppError(
        "An Audit Coordinator is not assigned to this audit.",
        409
      );
    }

    const remarks =
      normalize(
        data.remarks
      );

    const now =
      new Date();

    const fromStatus =
      finding.workflowStatus;


    /*
     * Preserve current assignment snapshots for historical display.
     */
    finding.leadAuditor =
      normalize(
        audit.leadAuditor
      );

    finding.auditCoordinator =
      coordinator;

    finding.leadReviewRemarks =
      remarks;

    finding.leadReviewedAt =
      now;

    finding.submittedToCoordinatorAt =
      now;

    finding.workflowStatus =
      "submitted_to_coordinator";


    /*
     * We preserve the semantic approval event even though the
     * persisted owner-state immediately becomes Coordinator.
     */
    appendWorkflowHistory(
      finding,
      {
        action:
          "approved_by_lead",

        fromStatus,

        toStatus:
          "approved_by_lead",

        currentUser,
        remarks,
        performedAt:
          now,
      }
    );

    appendWorkflowHistory(
      finding,
      {
        action:
          "submitted_to_coordinator",

        fromStatus:
          "approved_by_lead",

        toStatus:
          "submitted_to_coordinator",

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
        finding.severity,

      findings:
        finding.findings,

      proofFiles:
        Array.isArray(
          finding.proofFiles
        )
          ? finding.proofFiles
          : [],

      hasChecklist:
        Boolean(
          finding.hasChecklist
        ),

      status:
        "open",

      workflowStatus:
        "coordinator_generated",

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
