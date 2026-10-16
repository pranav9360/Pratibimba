import { normalizeZeroFindingRemark } from './zeroFindingPolicy.js';

/**
 * Pure validation for Coordinator decisions. This does not authorize requests,
 * acquire locks, mutate MongoDB, or close an audit.
 */
export function checkZeroFindingDecisionPreflight({
  audit, declaration, decision, coordinatorId, assignedCoordinatorId,
  rawFindingCount, consolidatedFindingCount, handoverCount,
  closureExists, returnRemark,
} = {}) {
  if (!audit || audit.workflowMode !== 'consolidated') {
    throw new Error('Consolidated scheduled audit required.');
  }
  if (audit.status === 'completed' || closureExists) {
    throw new Error('Audit already closed.');
  }
  if (!declaration || declaration.status !== 'submitted') {
    throw new Error('A pending submitted all-clear declaration is required.');
  }
  if (!coordinatorId || !assignedCoordinatorId ||
      String(coordinatorId) !== String(assignedCoordinatorId)) {
    throw new Error('Only the assigned Audit Coordinator may decide.');
  }
  if (decision !== 'approve' && decision !== 'return') {
    throw new Error('Decision must be approve or return.');
  }
  for (const [name, count] of Object.entries({rawFindingCount, consolidatedFindingCount, handoverCount})) {
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new TypeError(`${name} must be verified.`);
    }
  }
  if (rawFindingCount || consolidatedFindingCount || handoverCount) {
    throw new Error('Recorded findings or handovers block all-clear decisions.');
  }
  return {
    decision,
    coordinatorRemark: decision === 'return'
      ? normalizeZeroFindingRemark(returnRemark)
      : typeof returnRemark === 'string' ? returnRemark.trim().slice(0, 4000) : '',
  };
}
