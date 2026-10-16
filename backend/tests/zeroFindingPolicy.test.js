import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeZeroFindingRemark,
  assertZeroFindingEligible,
  assertZeroFindingApproval,
  ZERO_FINDING_REMARK_MAX,
} from '../services/zeroFindingPolicy.js';

test('requires a substantive remark and normalizes whitespace', () => {
  assert.equal(normalizeZeroFindingRemark('  All areas compliant.  '), 'All areas compliant.');
  for (const input of ['', '   ', null, 42]) assert.throws(() => normalizeZeroFindingRemark(input));
  assert.throws(() => normalizeZeroFindingRemark('x'.repeat(ZERO_FINDING_REMARK_MAX + 1)));
});

test('only an audit with zero recorded findings and no handover/closure is eligible', () => {
  assert.equal(assertZeroFindingEligible({ findings: [], priorHandover: false, closed: false }), true);
  assert.throws(() => assertZeroFindingEligible({ findings: [{ status: 'discarded_by_lead' }] }));
  assert.throws(() => assertZeroFindingEligible({ findings: [{ status: 'DRAFT' }] }));
  assert.throws(() => assertZeroFindingEligible({ findings: [], priorHandover: true }));
  assert.throws(() => assertZeroFindingEligible({ findings: [], closed: true }));
  assert.throws(() => assertZeroFindingEligible({}));
});

test('approval requires submitted declaration, no new findings, assigned Coordinator', () => {
  const valid = { declaration: { status: 'submitted' }, findingCount: 0,
    coordinatorName: 'Coordinator A', auditCoordinatorName: 'Coordinator A' };
  assert.equal(assertZeroFindingApproval(valid), true);
  assert.throws(() => assertZeroFindingApproval({ ...valid, findingCount: 1 }));
  assert.throws(() => assertZeroFindingApproval({ ...valid, coordinatorName: 'Other' }));
  assert.throws(() => assertZeroFindingApproval({ ...valid, declaration: { status: 'approved' } }));
});
