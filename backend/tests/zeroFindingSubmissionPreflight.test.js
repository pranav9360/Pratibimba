import test from 'node:test';
import assert from 'node:assert/strict';
import { checkZeroFindingSubmissionPreflight as check } from '../services/zeroFindingSubmissionPreflight.js';

const valid = () => ({
  audit: { workflowMode: 'consolidated', status: 'ongoing', leadAuditor: 'Lead A' },
  leadName: 'Lead A', remark: '  All areas reviewed and compliant.  ',
  findings: [], consolidatedFindings: [], auditorSubmissions: [{}, {}],
  expectedAuditorCount: 2, priorHandover: false,
  priorDeclaration: null, existingClosure: null,
});

test('valid complete zero-finding preflight normalizes remark', () => {
  assert.deepEqual(check(valid()), { remark: 'All areas reviewed and compliant.' });
});
test('rejects incomplete auditor responses and unverified inventory', () => {
  assert.throws(() => check({ ...valid(), auditorSubmissions: [{}] }), /Every assigned Auditor/);
  assert.throws(() => check({ ...valid(), auditorSubmissions: undefined }), /inventories/);
  assert.throws(() => check({ ...valid(), expectedAuditorCount: undefined }), /verified/);
});
test('rejects findings even when draft or discarded', () => {
  assert.throws(() => check({ ...valid(), findings: [{ status: 'DRAFT' }] }), /recorded findings/);
  assert.throws(() => check({ ...valid(), consolidatedFindings: [{}] }), /Consolidated findings/);
});
test('rejects wrong lead, workflow, closure, and duplicate declaration', () => {
  assert.throws(() => check({ ...valid(), leadName: 'Other' }), /assigned Lead Auditor/);
  assert.throws(() => check({ ...valid(), audit: { ...valid().audit, workflowMode: 'legacy' } }), /consolidated/);
  assert.throws(() => check({ ...valid(), audit: { ...valid().audit, status: 'completed' } }), /Completed/);
  assert.throws(() => check({ ...valid(), priorHandover: true }), /previous finding handover/);
  assert.throws(() => check({ ...valid(), priorDeclaration: {} }), /already exists/);
  assert.throws(() => check({ ...valid(), existingClosure: {} }), /already closed/);
});
