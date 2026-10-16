import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import ScheduledAudit from '../models/ScheduledAudit.js';
import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';
import AuditFinding from '../models/AuditFinding.js';
import AuditorSubmission from '../models/AuditorSubmission.js';
import CoordinatorBatchClosure from '../models/CoordinatorBatchClosure.js';
import LeadBatchSubmission from '../models/LeadBatchSubmission.js';
import ConsolidatedFinding from '../models/ConsolidatedFinding.js';
import Report from '../models/Report.js';
import { acquireLegacyAuditWriteBarrier, withAuditWrite, assertAuditHistoryCanBeRemoved } from '../services/legacyAuditWriteBarrier.js';
import { createAuditFindingDraft } from '../services/auditFindingService.js';
import { updateScheduledAudit, deleteScheduledAudit } from '../services/scheduledAuditService.js';
import { createReport } from '../services/reportService.js';
const q = value => ({ session() { return this; }, select() { return this; }, then(resolve,reject) { return Promise.resolve(value).then(resolve,reject); } });
const methods = [[mongoose,'startSession'],[ScheduledAudit,'findById'],[ScheduledAudit,'findOne'],[ScheduledAudit,'updateOne'],[ScheduledAudit,'deleteOne'],[AuditFinding,'create'],...[ZeroFindingDeclaration,AuditFinding,AuditorSubmission,Report,LeadBatchSubmission,CoordinatorBatchClosure,ConsolidatedFinding].map(m=>[m,'exists'])];
const originals=methods.map(([o,k])=>[o,k,o[k]]);
let audit, declaration, writes, locked, ended;
const user={_id:'aaaaaaaaaaaaaaaaaaaaaaaa',name:'Lead',role:'auditor'};
beforeEach(()=>{
 audit={_id:'bbbbbbbbbbbbbbbbbbbbbbbb',auditPlan:'cccccccccccccccccccccccc',workflowMode:'legacy',status:'ongoing',leadAuditor:'Lead',auditCoordinator:'Coordinator',auditors:['Lead'],startDate:new Date(Date.now()-86400000),endDate:new Date(Date.now()-1000),auditAreas:['Safety']};declaration=null;writes=0;locked=0;ended=0;
 mongoose.startSession=async()=>({withTransaction:async fn=>fn(),endSession:async()=>ended++});
 ScheduledAudit.findById=()=>q(audit);ScheduledAudit.findOne=async()=>audit;
 ScheduledAudit.updateOne=async(f,u,opts)=>{assert.ok(opts.session);assert.equal(u.$inc.workflowRevision,1);locked++;return{modifiedCount:1}};
 ScheduledAudit.deleteOne=async()=>{writes++;return{deletedCount:1}};
 AuditFinding.create=async(records,opts)=>{assert.ok(locked);assert.ok(opts.session);writes++;return records};
 for(const model of [AuditFinding,AuditorSubmission,Report,LeadBatchSubmission,CoordinatorBatchClosure,ConsolidatedFinding])model.exists=()=>q(null);
 ZeroFindingDeclaration.exists=filter=>q(declaration && (!filter.status || filter.status.$in.includes(declaration.status)) ? {_id:'declaration'}:null);
});
afterEach(()=>{for(const[o,k,v]of originals)o[k]=v});
for(const status of ['submitted','approved'])test(`${status} All Clear prevents draft insertion, manual IQR, scheduling edit and deletion`,async()=>{
 declaration={status};
 await assert.rejects(createAuditFindingDraft(audit._id,{description:'Late issue',classification:'NC'},user),{statusCode:409});
 await assert.rejects(createReport({scheduledAudit:audit._id,observations:[{findings:'Late issue',severity:'non_conformance'}]}, {name:'Coordinator',role:'audit_coordinator'}),{statusCode:409});
 await assert.rejects(updateScheduledAudit(audit._id,{endDate:new Date()}, {name:'Coordinator',role:'audit_coordinator'}),{statusCode:409});
 await assert.rejects(deleteScheduledAudit(audit._id,{name:'Coordinator',role:'audit_coordinator'}),{statusCode:409});
 assert.equal(writes,0);assert.equal(ended,4);
});
test('returned declaration permits finding correction but its history cannot be deleted',async()=>{
 declaration={status:'returned'};
 const finding=await createAuditFindingDraft(audit._id,{description:'Recorded after return',classification:'NC'},user);assert.equal(finding.description,'Recorded after return');assert.equal(writes,1);
 await assert.rejects(deleteScheduledAudit(audit._id,{role:'admin'}),{statusCode:409});assert.equal(writes,1);
});
test('completed ordinary legacy audits retain their existing finding-entry rules',async()=>{
 audit.status='completed';const finding=await createAuditFindingDraft(audit._id,{description:'Existing legacy rule',classification:'OFI'},user);assert.equal(finding.status,'DRAFT');assert.equal(writes,1);
});
test('final zero response is rechecked under the transaction lock before draft insertion',async()=>{
 let checks=0;AuditorSubmission.exists=()=>q(++checks===1?null:{_id:'final'});
 await assert.rejects(createAuditFindingDraft(audit._id,{description:'Racing draft',classification:'NC'},user),{statusCode:409});assert.equal(writes,0);assert.equal(locked,1);
});
test('returned history, any submitted response, report or finding prevents lifecycle removal',async()=>{
 for(const model of [ZeroFindingDeclaration,AuditFinding,AuditorSubmission,Report,LeadBatchSubmission,CoordinatorBatchClosure,ConsolidatedFinding]){
  const old=model.exists;model.exists=()=>q({_id:'history'});await assert.rejects(assertAuditHistoryCanBeRemoved(audit,{}),{statusCode:409});model.exists=old;
 }
 audit.status='completed';await assert.rejects(assertAuditHistoryCanBeRemoved(audit,{}),{statusCode:409});
});
test('transaction always ends on rejection and missing audits never invoke writer',async()=>{
 ScheduledAudit.findById=()=>q(null);await assert.rejects(withAuditWrite(audit._id,()=>assert.fail('must not write')),{statusCode:404});assert.equal(ended,1);assert.equal(writes,0);
});
test('barrier takes an audit document write before checking declaration state',async()=>{
 let checked=false;ZeroFindingDeclaration.exists=()=>{assert.equal(locked,1);checked=true;return q(null)};
 assert.equal(await acquireLegacyAuditWriteBarrier(audit._id,{}),audit);assert.equal(checked,true);
});

test('legacy write barrier refuses nontransactional use',async()=>{await assert.rejects(acquireLegacyAuditWriteBarrier(audit._id,null),{statusCode:503});assert.equal(locked,0)});
