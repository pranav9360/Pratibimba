import AuditFinding from "../models/AuditFinding.js";
import LeadBatchSubmission from "../models/LeadBatchSubmission.js";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";
import { assertConsolidatedAuditReadyForCompletion } from "./consolidatedCompletionGuard.js";
import { verifyApprovedZeroFindingAtClosure } from "./zeroFindingWorkflowService.js";
import AppError from "../utils/AppError.js";

export function assertAuditEndReached(audit, now = new Date()) {
  const end = audit.endDate ? new Date(audit.endDate).getTime() : NaN;
  if (!Number.isFinite(end)) throw new AppError("Scheduled audit has an invalid End Date.", 400);
  if (now.getTime() < end) throw new AppError("Completion is unavailable until the scheduled end date and time.", 409);
}
export async function assertScheduledAuditOutcome(audit, session = null) {
  if (!["legacy", "consolidated"].includes(audit.workflowMode || "legacy")) throw new AppError("Unknown audit workflow; administrative review required.", 409);
  const pending = await ZeroFindingDeclaration.exists({ scheduledAudit: audit._id, status: "submitted" }).session(session);
  if (pending) throw new AppError("The Coordinator must decide the pending All Clear declaration.", 409);
  const approvedDeclaration = await ZeroFindingDeclaration.exists({ scheduledAudit: audit._id, status: "approved" }).session(session);
  if (approvedDeclaration) {
    await verifyApprovedZeroFindingAtClosure(audit, session);
    return "all_clear";
  }
  if (audit.workflowMode === "consolidated") {
    await assertConsolidatedAuditReadyForCompletion(audit, session);
    return "consolidated_findings";
  }
  // Approved policy: legacy Lead-forwarded findings count, never drafts or mere receipt.
  const handover = await LeadBatchSubmission.exists({ scheduledAudit: audit._id, approvedCount: { $gt: 0 } }).session(session);
  const approved = await AuditFinding.find({ scheduledAudit: audit._id,
    status: "SUBMITTED", workflowStatus: { $in: ["submitted_to_coordinator", "converted_to_report"] },
    coordinatorVerifiedAt: { $ne: null }, coordinatorCompletedAt: { $ne: null },
    coordinatorCompletedBy: { $ne: null }, submittedToCoordinatorAt: { $ne: null },
  }).select("coordinatorEditedCopy").session(session);
  if (!handover || !approved.some(f => f.coordinatorEditedCopy?.findings?.trim() &&
    ["non_conformance", "open_for_improvement"].includes(f.coordinatorEditedCopy.severity))) {
    throw new AppError("Completion requires a Lead-forwarded finding verified and approved by the Coordinator, or an approved All Clear declaration.", 409);
  }
  return "legacy_approved_findings";
}
