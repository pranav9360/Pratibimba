import test,{beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';import mongoose from 'mongoose';
import ScheduledAudit from '../models/ScheduledAudit.js';import AuditPlan from '../models/AuditPlan.js';import AuditFinding from '../models/AuditFinding.js';import ConsolidatedFinding from '../models/ConsolidatedFinding.js';import ConsolidatedFindingSourceClaim from '../models/ConsolidatedFindingSourceClaim.js';import AuditorSubmission from '../models/AuditorSubmission.js';import LeadBatchSubmission from '../models/LeadBatchSubmission.js';import CoordinatorBatchClosure from '../models/CoordinatorBatchClosure.js';import Report from '../models/Report.js';import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';
import {getZeroFindingStatus,listZeroFindingStatuses,listCompletedZeroFindingSummaries} from '../controllers/zeroFindingController.js';
import {submitZeroFinding,decideZeroFinding} from '../services/zeroFindingWorkflowService.js';import {completeScheduledAudit,getScheduledAudits} from '../services/scheduledAuditService.js';
const id='aaaaaaaaaaaaaaaaaaaaaaaa',lead={_id:'lead',role:'auditor',name:'Lead'},coordinator={_id:'coordinator',role:'audit_coordinator',name:'Coordinator'};
const methods=[[mongoose,'startSession'],[ScheduledAudit,'findOneAndUpdate'],[ScheduledAudit,'exists'],[ScheduledAudit,'findOne'],[ScheduledAudit,'findById'],[ScheduledAudit,'find'],[ZeroFindingDeclaration,'find'],[AuditPlan,'findById'],[ZeroFindingDeclaration,'exists'],[ZeroFindingDeclaration,'findOne'],[ZeroFindingDeclaration,'create'],[AuditorSubmission,'find'],...[AuditFinding,ConsolidatedFinding,LeadBatchSubmission,CoordinatorBatchClosure,Report,ConsolidatedFindingSourceClaim].map(m=>[m,'countDocuments']),...[AuditFinding,ConsolidatedFinding,CoordinatorBatchClosure,Report].map(m=>[m,'find'])];
const originals=methods.map(([object,key])=>[object,key,object[key]]);const q=value=>({session(){return this},sort(){return this},select(){return this},lean(){return Promise.resolve(value)},then(resolve,reject){return Promise.resolve(value).then(resolve,reject)}});
let audit,declaration,counts,submissions,plan;
beforeEach(()=>{
 audit={_id:id,auditPlan:'plan',workflowMode:'consolidated',status:'ongoing',endDate:new Date(Date.now()-1000),leadAuditor:'Lead',auditCoordinator:'Coordinator',auditors:['Lead'],save:async()=>{}};declaration=null;counts=new Map();submissions=[{auditorName:'Lead',findingCount:0}];plan={status:'scheduled',save:async()=>{}};
 mongoose.startSession=async()=>({withTransaction:async fn=>fn(),endSession:async()=>{}});
 ScheduledAudit.exists=()=>q(null);
 ScheduledAudit.findOneAndUpdate=async()=>audit.status==='completed'?null:audit;ScheduledAudit.findOne=async()=>audit;AuditPlan.findById=()=>q(plan);
 ZeroFindingDeclaration.exists=filter=>q(declaration&&(filter.status?.$in?filter.status.$in.includes(declaration.status):declaration.status===filter.status)?{}:null);
 ZeroFindingDeclaration.findOne=()=>q(declaration);ZeroFindingDeclaration.create=async([record])=>{declaration={...record,save:async()=>{}};return[declaration]};
 AuditorSubmission.find=()=>q(submissions);for(const m of [AuditFinding,ConsolidatedFinding,LeadBatchSubmission,CoordinatorBatchClosure,Report,ConsolidatedFindingSourceClaim])m.countDocuments=()=>q(counts.get(m)||0);
});
afterEach(()=>{for(const [object,key,value]of originals)object[key]=value});
test('Lead attests, Coordinator approves, separate completion saves timestamps and no fake report',async()=>{
 await submitZeroFinding(id,lead,{remark:'Audit work completed without findings.',workCompleted:true});assert.ok(declaration.workCompletedAt);assert.equal(declaration.status,'submitted');
 await assert.rejects(completeScheduledAudit(id,coordinator),{statusCode:409});
 await decideZeroFinding(id,coordinator,{decision:'approve',remark:'Reviewed'});const approvedAt=declaration.approvedAt;
 assert.equal(audit.status,'ongoing');await completeScheduledAudit(id,coordinator);assert.equal(audit.status,'completed');assert.equal(plan.status,'completed');assert.ok(audit.completedAt);assert.equal(audit.completedBy,'coordinator');assert.equal(declaration.approvedAt,approvedAt);assert.deepEqual(declaration.history.map(h=>h.action),['submitted','approved']);
 const completedAt=audit.completedAt;await completeScheduledAudit(id,coordinator);assert.equal(audit.completedAt,completedAt);
});
test('All Clear requires explicit completed-work confirmation and reached end timestamp',async()=>{
 await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings'}),{statusCode:400});audit.endDate=new Date(Date.now()+60000);await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});assert.equal(declaration,null);
});
test('recorded draft/discarded findings, claims, reports and incomplete responses block All Clear',async()=>{
 for(const model of [AuditFinding,ConsolidatedFindingSourceClaim,Report]){counts.set(model,1);await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});counts.clear()}
 submissions=[];await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});assert.equal(declaration,null);
});
test('Coordinator may return when conflicting evidence appears; resubmission retains history',async()=>{
 await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});counts.set(AuditFinding,1);
 await assert.rejects(decideZeroFinding(id,coordinator,{decision:'approve'}),{statusCode:409});
 await decideZeroFinding(id,coordinator,{decision:'return',remark:'Review recorded source'});assert.equal(declaration.status,'returned');assert.equal(declaration.approvedAt,null);
 await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});counts.clear();
 await submitZeroFinding(id,lead,{remark:'Verified empty inventory',workCompleted:true});assert.deepEqual(declaration.history.map(h=>h.action),['submitted','returned','submitted']);
});
test('wrong Lead/Coordinator, invalid remarks and duplicate declarations are rejected',async()=>{
 await assert.rejects(submitZeroFinding(id,{...lead,name:'Other'},{remark:'No findings',workCompleted:true}),{statusCode:403});
 await assert.rejects(submitZeroFinding(id,lead,{remark:'',workCompleted:true}),{statusCode:400});
 await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});
 await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});
 await assert.rejects(decideZeroFinding(id,{...coordinator,name:'Other'},{decision:'approve'}),{statusCode:403});
 await assert.rejects(decideZeroFinding(id,coordinator,{decision:'return',remark:''}),{statusCode:400});
});
test('missing end timestamp and old pending declarations cannot invent completed-work confirmation',async()=>{
 audit.endDate=null;await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});
 audit.endDate=new Date(Date.now()-1000);await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});
 declaration.workCompletedAt=null;await assert.rejects(decideZeroFinding(id,coordinator,{decision:'approve'}),{statusCode:409});assert.equal(declaration.status,'submitted');
 await decideZeroFinding(id,coordinator,{decision:'return',remark:'Please confirm work completion'});assert.equal(declaration.status,'returned');
});

for (const mode of ['legacy', 'consolidated']) {
 test(`${mode}: zero responses → submit → return → revise → approve → explicit completion; no IQR writes`, async () => {
  audit.workflowMode = mode;
  const originalCreate = Report.create, originalConsolidatedCreate = ConsolidatedFinding.create;
  Report.create = ConsolidatedFinding.create = async () => assert.fail('All Clear must not fabricate a report or finding');
  try {
   await submitZeroFinding(id, lead, {remark:'All Auditor work reviewed; no findings.',workCompleted:true});
   assert.equal(audit.status,'ongoing');
   await assert.rejects(submitZeroFinding(id,lead,{remark:'Repeated',workCompleted:true}),{statusCode:409});
   await assert.rejects(decideZeroFinding(id,coordinator,{decision:'return',remark:' '}),{statusCode:400});
   await decideZeroFinding(id,coordinator,{decision:'return',remark:'Clarify reviewed areas.'});
   await submitZeroFinding(id,lead,{remark:'All areas and every Auditor response reviewed.',workCompleted:true});
   await decideZeroFinding(id,coordinator,{decision:'approve',remark:'Reviewed and approved.'});
   assert.equal(audit.status,'ongoing');
   await completeScheduledAudit(id,coordinator);
   assert.equal(audit.outcome,'all_clear');assert.equal(audit.status,'completed');
   assert.deepEqual(declaration.history.map(h=>h.action),['submitted','returned','submitted','approved']);
   assert.deepEqual(declaration.history.map(h=>h.name),['Lead','Coordinator','Lead','Coordinator']);
   assert.ok(declaration.history.every(h=>h.by && h.at));
  } finally { Report.create=originalCreate; ConsolidatedFinding.create=originalConsolidatedCreate; }
 });
 test(`${mode}: every inventory type blocks All Clear, including discarded sources and prior handovers`,async()=>{
  audit.workflowMode=mode;
  for(const model of [AuditFinding,ConsolidatedFinding,LeadBatchSubmission,CoordinatorBatchClosure,Report,ConsolidatedFindingSourceClaim]){
   counts.set(model,1);await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});counts.clear();
  }
 });
 test(`${mode}: late findings block approval and completion; return preserves history`,async()=>{
  audit.workflowMode=mode;await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});
  counts.set(AuditFinding,1);await assert.rejects(decideZeroFinding(id,coordinator,{decision:'approve'}),{statusCode:409});
  counts.clear();await decideZeroFinding(id,coordinator,{decision:'approve'});counts.set(Report,1);
  await assert.rejects(completeScheduledAudit(id,coordinator),{statusCode:409});assert.equal(audit.status,'ongoing');
 });
}
test('one missing, nonzero, duplicate or unexpected Auditor response never qualifies',async()=>{
 audit.auditors=['Lead','Second'];
 for(const responses of [[{auditorName:'Lead',findingCount:0}],[{auditorName:'Lead',findingCount:0},{auditorName:'Second',findingCount:1}],[{auditorName:'Lead',findingCount:0},{auditorName:'Lead',findingCount:0}],[{auditorName:'Lead',findingCount:0},{auditorName:'Other',findingCount:0}]]){
  submissions=responses;await assert.rejects(submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true}),{statusCode:409});
 }
});
test('end instant is inclusive and a later reschedule blocks approval; author cannot self-approve',async()=>{
 const originalNow=Date.now;const end=Date.now();Date.now=()=>end;audit.endDate=new Date(end);
 try {await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});audit.endDate=new Date(end+1);await assert.rejects(decideZeroFinding(id,coordinator,{decision:'approve'}),{statusCode:409});audit.endDate=new Date(end);await assert.rejects(decideZeroFinding(id,{...coordinator,_id:lead._id},{decision:'approve'}),{statusCode:403});await decideZeroFinding(id,coordinator,{decision:'approve'});}finally{Date.now=originalNow}
});
test('read-only status includes traceable schedule, declaration and eligibility without exposing unrelated audits',async()=>{
 ScheduledAudit.findById=()=>q(audit);await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});
 let body,error;const res={status(){return this},json(value){body=value;return this}};
 await getZeroFindingStatus({params:{scheduledAuditId:id},user:coordinator},res,e=>{error=e});assert.equal(error,undefined);assert.equal(body.data.declaration.status,'submitted');assert.equal(body.data.audit._id,id);
 await getZeroFindingStatus({params:{scheduledAuditId:id},user:{role:'auditor',name:'Unassigned'}},res,e=>{error=e});assert.equal(body.success,false);
});
test('table statuses are restricted to the authenticated Coordinator assignment',async()=>{
 ScheduledAudit.find=filter=>{assert.deepEqual(filter,{auditCoordinator:'Coordinator'});return q([audit])};
 ZeroFindingDeclaration.find=filter=>{assert.deepEqual(filter.scheduledAudit.$in,[id]);return q([{scheduledAudit:id,status:'submitted'}])};
 let body;await listZeroFindingStatuses({user:coordinator},{status(){return this},json(value){body=value}},e=>{throw e});assert.equal(body.data[id],'submitted');
});

test('inconsistent shared-plan execution links cannot accidentally complete another audit plan',async()=>{
 await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});await decideZeroFinding(id,coordinator,{decision:'approve'});
 ScheduledAudit.exists=()=>q({_id:'another-schedule'});await assert.rejects(completeScheduledAudit(id,coordinator),{statusCode:409});assert.equal(audit.status,'ongoing');assert.equal(plan.status,'scheduled');
});

for(const mode of ['legacy','consolidated'])test(`${mode}: completed All Clear remains in Scheduled Audits and separate closure summaries`,async()=>{
 audit.workflowMode=mode;await submitZeroFinding(id,lead,{remark:'No findings',workCompleted:true});await decideZeroFinding(id,coordinator,{decision:'approve'});await completeScheduledAudit(id,coordinator);
 ScheduledAudit.find=filter=>{assert.equal(filter.auditCoordinator,'Coordinator');assert.equal(filter.workflowMode,undefined);return q([audit])};
 for(const model of [AuditFinding,ConsolidatedFinding,CoordinatorBatchClosure,Report])model.find=()=>q([]);
 assert.deepEqual((await getScheduledAudits({},coordinator)).map(a=>a._id),[id]);
 ZeroFindingDeclaration.find=()=>q([{...declaration,scheduledAudit:id}]);let body;await listCompletedZeroFindingSummaries({user:coordinator},{status(){return this},json(value){body=value}},error=>{throw error});assert.equal(body.data[0]._id,id);assert.ok(body.data[0].approvedAt);
});
