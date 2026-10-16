import test from 'node:test';
import assert from 'node:assert/strict';

import AuditFinding from '../models/AuditFinding.js';
import ConsolidatedFinding from '../models/ConsolidatedFinding.js';
import ConsolidatedFindingSourceClaim from '../models/ConsolidatedFindingSourceClaim.js';
import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';

import {
  assertConsolidatedAuditReadyForCompletion,
} from '../services/consolidatedCompletionGuard.js';

const original = {
  findings: AuditFinding.find,
  consolidated: ConsolidatedFinding.find,
  claims: ConsolidatedFindingSourceClaim.find,
  declaration: ZeroFindingDeclaration.findOne,
};

const audit = {
  _id: 'zero-finding-completion-test-audit',
  workflowMode: 'consolidated',
};

function mockQuery(value) {
  return {
    session() {
      return this;
    },
    select() {
      return Promise.resolve(value);
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
}

function installMocks({ status = null, findings = [], claims = [] } = {}) {
  AuditFinding.find = () => mockQuery(findings);
  ConsolidatedFinding.find = () => mockQuery([]);
  ConsolidatedFindingSourceClaim.find = () => mockQuery(claims);
  ZeroFindingDeclaration.findOne = () =>
    mockQuery(status === null ? null : { status });
}

test.after(() => {
  AuditFinding.find = original.findings;
  ConsolidatedFinding.find = original.consolidated;
  ConsolidatedFindingSourceClaim.find = original.claims;
  ZeroFindingDeclaration.findOne = original.declaration;
});

test('Missing All Clear declaration blocks zero-finding completion', async () => {
  installMocks();
  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 },
  );
});

test('Submitted All Clear declaration blocks completion', async () => {
  installMocks({ status: 'submitted' });
  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 },
  );
});

test('Returned All Clear declaration blocks completion', async () => {
  installMocks({ status: 'returned' });
  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 },
  );
});

test('Approved All Clear declaration permits zero-finding completion', async () => {
  installMocks({ status: 'approved' });
  await assert.doesNotReject(
    assertConsolidatedAuditReadyForCompletion(audit),
  );
});

test('Approved All Clear cannot bypass submitted findings', async () => {
  installMocks({
    status: 'approved',
    findings: [{ _id: 'submitted-finding' }],
  });
  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 },
  );
});

test('Approved All Clear cannot bypass orphan source claims', async () => {
  installMocks({
    status: 'approved',
    claims: [{ _id: 'orphan-claim' }],
  });
  await assert.rejects(
    assertConsolidatedAuditReadyForCompletion(audit),
    { statusCode: 409 },
  );
});
