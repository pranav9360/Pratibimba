import { assertZeroFindingEligible, normalizeZeroFindingRemark } from './zeroFindingPolicy.js';

/**
 * Pure preflight for the eventual transactional submit API.
 * This is NOT an authorization or concurrency boundary: the API must reload
 * the audit and related records inside the same MongoDB transaction, acquire
 * the audit write barrier, and verify the authenticated user's assignment.
 */
export function checkZeroFindingSubmissionPreflight({
  audit, leadName, remark, findings, consolidatedFindings,
  auditorSubmissions, expectedAuditorCount, priorHandover,
  priorDeclaration, existingClosure,
} = {}) {
  if (!audit || audit.workflowMode !== 'consolidated') {
    throw new Error('All-clear declarations require a consolidated scheduled audit.');
  }
  if (audit.status === 'completed') {
    throw new Error('Completed audits cannot be declared all clear.');
  }
  if (!leadName || audit.leadAuditor?.trim() !== leadName.trim()) {
    throw new Error('Only the assigned Lead Auditor may submit all clear.');
  }
  if (!Array.isArray(consolidatedFindings) || !Array.isArray(auditorSubmissions)) {
    throw new TypeError('Submission and consolidated finding inventories must be loaded.');
  }
  if (!Number.isSafeInteger(expectedAuditorCount) || expectedAuditorCount < 0) {
    throw new TypeError('Expected auditor count must be verified.');
  }
  if (auditorSubmissions.length !== expectedAuditorCount) {
    throw new Error('Every assigned Auditor must explicitly submit their audit response before all clear.');
  }
  if (consolidatedFindings.length > 0) {
    throw new Error('Consolidated findings exist; use the ordinary finding review path.');
  }
  if (priorDeclaration) {
    throw new Error('An all-clear declaration already exists for this audit.');
  }
  assertZeroFindingEligible({
    findings, priorHandover: Boolean(priorHandover),
    closed: Boolean(existingClosure),
  });
  return { remark: normalizeZeroFindingRemark(remark) };
}
