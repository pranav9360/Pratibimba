import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import AuditFinding from "../models/AuditFinding.js";
import ConsolidatedFinding from "../models/ConsolidatedFinding.js";
import ConsolidatedFindingSourceClaim from "../models/ConsolidatedFindingSourceClaim.js";
import Report from "../models/Report.js";
import AppError from "../utils/AppError.js";

/**
 * Consolidated-mode Scheduled Audit completion requirements.
 * Legacy audits are intentionally unaffected.
 *
 * Draft original Auditor findings do not block completion.
 * Zero submitted originals and zero consolidated findings is valid.
 */
export const assertConsolidatedAuditReadyForCompletion = async (audit, session = null) => {
  if (audit.workflowMode !== "consolidated") {
    return;
  }

  const sourceQuery = AuditFinding.find({
    scheduledAudit: audit._id,
    status: "SUBMITTED",
  }).select("_id");

  const consolidatedQuery = ConsolidatedFinding.find({
    scheduledAudit: audit._id,
  }).select("_id status workflowStatus sourceFindings report");

  // MongoDB transaction sessions must not execute parallel operations.
  const submittedSources = await (
    session ? sourceQuery.session(session) : sourceQuery
  );

  const consolidatedFindings = await (
    session ? consolidatedQuery.session(session) : consolidatedQuery
  );

  if (consolidatedFindings.length === 0) {
    const zeroFinding = await ZeroFindingDeclaration.findOne({ scheduledAudit: audit._id })
      .session(session).select('status');
    if (!zeroFinding || zeroFinding.status !== 'approved') {
      throw new AppError('Zero-finding completion requires an approved All Clear declaration.', 409);
    }
    if (submittedSources.length > 0) {
      throw new AppError(
        "Cannot complete this audit: submitted Auditor findings have not been consolidated.",
        409
      );
    }
    const orphanQuery = ConsolidatedFindingSourceClaim.find({
      scheduledAudit: audit._id,
      status: "active",
    }).select("_id");

    const orphanClaims = await (
      session ? orphanQuery.session(session) : orphanQuery
    );

    if (orphanClaims.length > 0) {
      throw new AppError(
        "Cannot complete this audit: active source claims exist without consolidated findings.",
        409
      );
    }

    return;
  }

  const incomplete = consolidatedFindings.some(
    (finding) =>
      finding.status !== "SUBMITTED" ||
      finding.workflowStatus !== "converted_to_report" ||
      !finding.report ||
      !Array.isArray(finding.sourceFindings) ||
      finding.sourceFindings.length === 0
  );

  if (incomplete) {
    throw new AppError(
      "Cannot complete this audit: every consolidated finding must have an official IQR.",
      409
    );
  }

  const submittedIds = new Set(submittedSources.map((source) => String(source._id)));
  const sourceCounts = new Map();

  for (const finding of consolidatedFindings) {
    for (const sourceId of finding.sourceFindings) {
      const key = String(sourceId);
      sourceCounts.set(key, (sourceCounts.get(key) || 0) + 1);
    }
  }

  if (
    [...submittedIds].some((id) => sourceCounts.get(id) !== 1) ||
    [...sourceCounts].some(([id, count]) => !submittedIds.has(id) || count !== 1)
  ) {
    throw new AppError(
      "Cannot complete this audit: original Auditor submissions are missing, duplicated, or inconsistent with consolidation.",
      409
    );
  }

  // Verify the claim ledger against the consolidated source lists.
  // Read within the same transaction as the completion decision.
  const claimQuery = ConsolidatedFindingSourceClaim.find({
    scheduledAudit: audit._id,
    status: "active",
  }).select("sourceFinding consolidatedFinding scheduledAudit");

  const claims = await (
    session ? claimQuery.session(session) : claimQuery
  );

  const expectedClaims = new Map();

  for (const finding of consolidatedFindings) {
    for (const sourceId of finding.sourceFindings) {
      expectedClaims.set(String(sourceId), String(finding._id));
    }
  }

  const seenClaims = new Set();

  for (const claim of claims) {
    const sourceId = String(claim.sourceFinding);
    const expectedFindingId = expectedClaims.get(sourceId);

    if (
      !expectedFindingId ||
      seenClaims.has(sourceId) ||
      String(claim.consolidatedFinding) !== expectedFindingId ||
      String(claim.scheduledAudit) !== String(audit._id)
    ) {
      throw new AppError(
        "Cannot complete this audit: source-finding claim records are inconsistent with consolidation.",
        409
      );
    }

    seenClaims.add(sourceId);
  }

  if (seenClaims.size !== expectedClaims.size) {
    throw new AppError(
      "Cannot complete this audit: one or more consolidated source claims are missing.",
      409
    );
  }

  const reportQuery = Report.find({
    scheduledAudit: audit._id,
    sourceConsolidatedFinding: {
      $in: consolidatedFindings.map((finding) => finding._id),
    },
  }).select("_id sourceConsolidatedFinding");

  const reports = await (
    session ? reportQuery.session(session) : reportQuery
  );

  const reportByFinding = new Map(
    reports.map((report) => [
      String(report.sourceConsolidatedFinding),
      String(report._id),
    ])
  );

  if (
    consolidatedFindings.some(
      (finding) =>
        reportByFinding.get(String(finding._id)) !== String(finding.report)
    )
  ) {
    throw new AppError(
      "Cannot complete this audit: one or more official IQR references could not be verified.",
      409
    );
  }
};
