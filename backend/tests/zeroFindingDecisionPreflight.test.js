import test from 'node:test';
import assert from 'node:assert/strict';
import { checkZeroFindingDecisionPreflight as check } from '../services/zeroFindingDecisionPreflight.js';

const valid = () => ({
  audit: {workflowMode:'consolidated',status:'ongoing'},
  declaration: {status:'submitted'},
  decision:'approve', coordinatorId:'123', assignedCoordinatorId:'123',
  rawFindingCount:0, consolidatedFindingCount:0, handoverCount:0,
  closureExists:false,
});

test('assigned Coordinator can approve a clean pending declaration', () => {
  assert.deepEqual(check(valid()), {decision:'approve', coordinatorRemark:''});
});
test('return requires a meaningful Coordinator remark', () => {
  assert.deepEqual(check({...valid(),decision:'return',returnRemark:'  Please recheck. '}),
    {decision:'return',coordinatorRemark:'Please recheck.'});
  assert.throws(()=>check({...valid(),decision:'return',returnRemark:' '}),/remark/);
});
test('rejects unauthorized Coordinator and invalid decision', () => {
  assert.throws(()=>check({...valid(),coordinatorId:'other'}),/assigned Audit Coordinator/);
  assert.throws(()=>check({...valid(),decision:'delete'}),/approve or return/);
});
test('rejects existing findings, handovers, and unknown inventory', () => {
  for(const key of ['rawFindingCount','consolidatedFindingCount','handoverCount']) {
    assert.throws(()=>check({...valid(),[key]:1}),/block all-clear/);
    assert.throws(()=>check({...valid(),[key]:undefined}),/must be verified/);
  }
});
test('rejects closed audits and non-pending declarations', () => {
  assert.throws(()=>check({...valid(),closureExists:true}),/already closed/);
  assert.throws(()=>check({...valid(),audit:{...valid().audit,status:'completed'}}),/already closed/);
  assert.throws(()=>check({...valid(),declaration:{status:'approved'}}),/pending submitted/);
});
