import ScheduledAudit from "../models/ScheduledAudit.js";
import AppError from "../utils/AppError.js";
import ZeroFindingDeclaration from "../models/ZeroFindingDeclaration.js";

/**
 * Coordinate consolidated-workflow writes through one Scheduled Audit
 * document within the caller's existing MongoDB transaction.
 *
 * Every participating writer must use this barrier before reading or
 * changing findings that affect completion eligibility.
 */
export const acquireConsolidatedAuditWriteBarrier = async (
  scheduledAuditId,
  session,
  { allowAllClear = false, allowLegacy = false } = {}
) => {
  if (!session) {
    throw new AppError(
      "A MongoDB transaction session is required for consolidated audit writes.",
      503
    );
  }

  const audit = await ScheduledAudit.findOneAndUpdate(
    {
      _id: scheduledAuditId,
      ...(allowLegacy ? {} : { workflowMode: "consolidated" }),
      status: { $ne: "completed" },
    },
    {
      $inc: { workflowRevision: 1 },
    },
    {
      new: true,
      session,
    }
  );

  if (!audit) {
    throw new AppError(
      "This consolidated Scheduled Audit is completed, unavailable, or has an invalid workflow mode.",
      409
    );
  }

  if (!['legacy', 'consolidated'].includes(audit.workflowMode || 'legacy')) throw new AppError('Unknown audit workflow; administrative review required.', 409);
  const activeAllClear = await ZeroFindingDeclaration.exists({
    scheduledAudit: scheduledAuditId,
    status: { $in: ['submitted', 'approved'] },
  }).session(session);
  if (activeAllClear && !allowAllClear) {
    throw new AppError('An All Clear declaration is pending or approved. Findings are locked until returned.', 409);
  }
  return audit;
};
