import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidNewPassword } from '../../shared/password-policy.mjs';
import { sortAuditRecords } from '../../shared/audit-order.mjs';
import { findingEvidenceStatus, actionEvidenceStatus, activeActionProofFiles, submittedActionEvidence } from '../../shared/evidence-status.mjs';
import { assertAuditEndReached, assertScheduledAuditOutcome } from '../services/scheduledAuditOutcome.js';
import AuditFinding from '../models/AuditFinding.js';
import LeadBatchSubmission from '../models/LeadBatchSubmission.js';
import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';
import { createUserValidator, updateUserValidator } from '../validators/userValidator.js';
import { resetPasswordValidator, loginValidator } from '../validators/authValidator.js';
import { validationResult } from 'express-validator';
for(const password of ['student123','hello2026','Password123','secure@123']) test(`shared creation policy accepts ${password}`,()=>assert.equal(isValidNewPassword(password),true));
for(const password of ['abcdefg','12345678','abcdefgh','abc123',null,12345678]) test(`shared creation policy rejects ${String(password)}`,()=>assert.equal(isValidNewPassword(password),false));
test('every password-setting HTTP validator agrees; login accepts legacy complexity',async()=>{
 for(const password of ['student123','abcdefgh','12345678','abc123']){
  for(const rules of [createUserValidator,updateUserValidator,resetPasswordValidator]){
   const req={body:{name:'Fixture',email:'fixture@example.test',role:'auditor',password,confirmPassword:password}};
   for(const rule of rules)await rule.run(req);
   assert.equal(validationResult(req).isEmpty(),isValidNewPassword(password));
  }
 }
 const req={body:{identifier:'fixture@example.test',password:'legacy'}};for(const rule of loginValidator)await rule.run(req);assert.equal(validationResult(req).isEmpty(),true);
});
test('IQA ordering is numeric, ascending, stable across reports, legacy IDs, and missing values',()=>{
 const rows=[{_id:'b',iqaNumber:'IQA-2027-10',iqrNumber:'IQR-2027-1'},{_id:'z',iqaNumber:null},{_id:'d',iqaNumber:'IQA-2026-2',iqrNumber:'IQR-2026-10'},{_id:'c',iqaNumber:'IQA-2026-2',iqrNumber:'IQR-2026-2'},{_id:'a',iqaNumber:'IQA-2027-2'},{_id:'e',iqaNumber:'IQAN26001'}];
 const result=sortAuditRecords(rows);assert.deepEqual(result.map(x=>x._id),['c','d','a','b','e','z']);assert.equal(rows[0]._id,'b');
 assert.deepEqual(sortAuditRecords([{id:'2',iqaNumber:'IQA-2026-1'},{id:'1',iqaNumber:'IQA-2026-1'}]).map(x=>x.id),['1','2']);
});
test('completion timestamp respects exact boundary and rejects invalid/missing/future end time',()=>{
 const end='2027-01-01T00:00:00.000Z';
 assert.throws(()=>assertAuditEndReached({endDate:end},new Date('2026-12-31T23:59:59.999Z')),{statusCode:409});
 assert.doesNotThrow(()=>assertAuditEndReached({endDate:end},new Date(end)));
 assert.doesNotThrow(()=>assertAuditEndReached({endDate:end},new Date('2027-01-01T05:30:00+05:30')));
 assert.throws(()=>assertAuditEndReached({},new Date()),{statusCode:400});
});
test('excluded and removed evidence cannot be active; snapshots and original arrays remain intact',()=>{
 const finding={proofFiles:['a','b'],evidenceReviews:[{token:'b',leadDropped:true}]};assert.equal(findingEvidenceStatus(finding,'b'),'excluded');assert.equal(findingEvidenceStatus(finding,'c'),'removed');assert.equal(findingEvidenceStatus(finding,'a'),'active');
 const report={actionProofFiles:['a','b','c'],withdrawnActionProofFiles:[{token:'b',status:'withdrawn'},{token:'c',status:'draft_removed'}],workflowHistory:[{action:'action_submitted',actionProofFilesSnapshot:['a','b']}]};
 assert.deepEqual(activeActionProofFiles(report),['a']);assert.equal(submittedActionEvidence(report,'b'),true);assert.equal(submittedActionEvidence(report,'c'),false);assert.equal(actionEvidenceStatus(report,'b'),'withdrawn');assert.equal(report.workflowHistory[0].actionProofFilesSnapshot.length,2);assert.equal(report.actionProofFiles.length,3);
});
const q=value=>({session(){return this},select(){return this},then(resolve,reject){return Promise.resolve(value).then(resolve,reject)}});
test('legacy completion requires actual Lead handover and valid verified Coordinator approval',async()=>{
 const old={zero:ZeroFindingDeclaration.exists,lead:LeadBatchSubmission.exists,find:AuditFinding.find};
 try {
  ZeroFindingDeclaration.exists=()=>q(null);let handover=null,rows=[];LeadBatchSubmission.exists=()=>q(handover);AuditFinding.find=filter=>{assert.equal(filter.status,'SUBMITTED');assert.ok(filter.coordinatorCompletedBy);return q(rows)};
  for(const [h,r] of [[null,[]],[{},[]],[{},[{coordinatorEditedCopy:{findings:'Valid',severity:'unclassified'}}]]]){handover=h;rows=r;await assert.rejects(assertScheduledAuditOutcome({_id:'audit',workflowMode:'legacy'}),{statusCode:409})}
  handover={};rows=[{coordinatorEditedCopy:{findings:'Approved',severity:'non_conformance'}}];assert.equal(await assertScheduledAuditOutcome({_id:'audit',workflowMode:'legacy'}),'legacy_approved_findings');
  ZeroFindingDeclaration.exists=filter=>q(filter.status==='submitted'?{}:null);await assert.rejects(assertScheduledAuditOutcome({_id:'audit',workflowMode:'legacy'}),{statusCode:409});
 }finally{ZeroFindingDeclaration.exists=old.zero;LeadBatchSubmission.exists=old.lead;AuditFinding.find=old.find;}
});

test('dashboard completion count follows persisted approval/completion state, not elapsed dates',()=>{
 const source=readFileSync(new URL('../../artifacts/pratibimba/src/pages/dashboard.tsx',import.meta.url),'utf8');
 const expression=source.match(/const auditsCompleted = ([^;]+);/)[1];
 assert.equal(vm.runInNewContext(expression,{scheduledAudits:[{status:'ongoing',endDate:'2000-01-01'},{status:'completed',endDate:'2000-01-01'}]}),1);
});
