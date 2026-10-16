/**
 * Zero-finding audit declaration policy.
 * Pure, side-effect-free rules shared by the forthcoming Lead/Coordinator API.
 * This module deliberately does not write to MongoDB or close an audit.
 */
export const ZERO_FINDING_REMARK_MAX = 4000;

export function normalizeZeroFindingRemark(value) {
  if (typeof value !== 'string') throw new TypeError('An audit remark is required.');
  const remark = value.trim().replace(/\r\n/g, '\n');
  if (!remark) throw new RangeError('An audit remark is required.');
  if (remark.length > ZERO_FINDING_REMARK_MAX) {
    throw new RangeError(`Audit remark must not exceed ${ZERO_FINDING_REMARK_MAX} characters.`);
  }
  return remark;
}

/**
 * A declaration cannot override any recorded finding, including discarded
 * or draft findings. Any findings require the ordinary review/closure path.
 * Auditor submission status is separate and must be checked by the API.
 */
export function assertZeroFindingEligible({ findings, priorHandover, closed } = {}) {
  if (!Array.isArray(findings)) throw new TypeError('Finding inventory must be loaded before declaring all clear.');
  if (findings.length !== 0) throw new Error('An audit with recorded findings cannot be declared all clear.');
  if (priorHandover) throw new Error('An audit with a previous finding handover cannot be declared all clear.');
  if (closed) throw new Error('This audit is already closed.');
  return true;
}

export function assertZeroFindingApproval({ declaration, findingCount, coordinatorName, auditCoordinatorName } = {}) {
  if (!declaration || declaration.status !== 'submitted') {
    throw new Error('A submitted all-clear declaration is required.');
  }
  if (findingCount !== 0) throw new Error('New findings prevent all-clear approval.');
  if (!coordinatorName || coordinatorName.trim() !== auditCoordinatorName?.trim()) {
    throw new Error('Only the assigned Audit Coordinator may approve the declaration.');
  }
  return true;
}
