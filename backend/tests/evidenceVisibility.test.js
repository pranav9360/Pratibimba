import express from 'express';import jwt from 'jsonwebtoken';
import findingRoutes from '../routes/auditFindingRoutes.js';import reportRoutes from '../routes/reportRoutes.js';import errorHandler from '../middleware/errorHandler.js';
import test,{beforeEach,afterEach} from 'node:test';import assert from 'node:assert/strict';
import mongoose from 'mongoose';import AuditFinding from '../models/AuditFinding.js';import ScheduledAudit from '../models/ScheduledAudit.js';import AuditorSubmission from '../models/AuditorSubmission.js';import CoordinatorBatchClosure from '../models/CoordinatorBatchClosure.js';import Report from '../models/Report.js';import User from '../models/User.js';import Prakalpa from '../models/Prakalpa.js';
import {downloadFindingEvidence,removeDraftFindingEvidence,reviewFindingEvidence} from '../controllers/findingEvidenceController.js';
import {downloadReportActionEvidence,withdrawReportActionEvidence} from '../controllers/reportActionEvidenceController.js';
const fileId='111111111111111111111111',recordId='222222222222222222222222',token='evidence:'+fileId,actionToken='action-evidence:'+fileId;
const original={finding:AuditFinding.findById,update:AuditFinding.findOneAndUpdate,audit:ScheduledAudit.findById,submission:AuditorSubmission.exists,closure:CoordinatorBatchClosure.exists,report:Report.findById,reportUpdate:Report.findOneAndUpdate,user:User.find,project:Prakalpa.find,db:mongoose.connection.db};
let finding,report,audit,updates,reads,manager;
const invoke=(handler,user,body={})=>new Promise((resolve,reject)=>handler({params:{id:recordId,fileId},user,body},{json:resolve,setHeader(){throw new Error('Unexpected blob access')}},reject));
beforeEach(()=>{
 finding={_id:recordId,scheduledAudit:'audit',submittedBy:'owner',status:'DRAFT',workflowStatus:'auditor_draft',proofFiles:[token],evidenceReviews:[]};
 report={_id:recordId,scheduledAudit:'audit',workflowStatus:'sent_to_prakalpa',actionProofFiles:[actionToken],workflowHistory:[]};
 audit={_id:'audit',prakalpa:'P',auditCoordinator:'Coordinator',leadAuditor:'Lead',auditors:['Owner'],workflowMode:'legacy'};
 manager={_id:'manager',name:'Manager',role:'prakalpa_manager',active:true,prakalpa:'P',assignedPrakalpas:['P']};updates=[];reads=0;
 AuditFinding.findById=async()=>finding;ScheduledAudit.findById=async()=>audit;AuditorSubmission.exists=CoordinatorBatchClosure.exists=async()=>null;Report.findById=async()=>report;
 AuditFinding.findOneAndUpdate=async(filter,update)=>{updates.push({filter,update});return {...finding,evidenceReviews:[]}};
 Report.findOneAndUpdate=async(filter,update)=>{updates.push({filter,update});return report};
 const q=value=>({select(){return this},lean:async()=>value});User.find=()=>q([manager]);Prakalpa.find=()=>q([{name:'P',active:true}]);
 mongoose.connection.db={collection(){return{findOne:async()=>{reads++;return null}}}};
});
afterEach(()=>{AuditFinding.findById=original.finding;AuditFinding.findOneAndUpdate=original.update;ScheduledAudit.findById=original.audit;AuditorSubmission.exists=original.submission;CoordinatorBatchClosure.exists=original.closure;Report.findById=original.report;Report.findOneAndUpdate=original.reportUpdate;User.find=original.user;Prakalpa.find=original.project;mongoose.connection.db=original.db});
const owner={_id:'owner',role:'auditor',name:'Owner'},coordinator={_id:'coordinator',role:'audit_coordinator',name:'Coordinator'};
test('owner can detach unsubmitted draft; history preserved and GridFS never deleted',async()=>{await invoke(removeDraftFindingEvidence,owner);assert.equal(updates[0].update.$pull.proofFiles,token);assert.equal(updates[0].update.$push.withdrawnEvidenceFiles.token,token);assert.equal(reads,0)});
test('submitted evidence cannot use draft-removal endpoint',async()=>{finding.status='SUBMITTED';finding.workflowStatus='submitted_to_lead';await assert.rejects(invoke(removeDraftFindingEvidence,owner),{statusCode:409});assert.equal(updates.length,0)});
test('final Auditor batch prevents draft removal',async()=>{AuditorSubmission.exists=async()=>({});await assert.rejects(invoke(removeDraftFindingEvidence,owner),{statusCode:409});assert.equal(updates.length,0)});
test('excluded finding evidence denied to Coordinator via direct URL, without blob query',async()=>{finding.workflowStatus='submitted_to_coordinator';finding.evidenceReviews=[{token,leadDropped:true}];await assert.rejects(invoke(downloadFindingEvidence,coordinator),{statusCode:404});assert.equal(reads,0)});
test('excluded evidence denied even to normal administrator viewer',async()=>{finding.evidenceReviews=[{token,coordinatorDropped:true}];await assert.rejects(invoke(downloadFindingEvidence,{role:'super_admin'}),{statusCode:404});assert.equal(reads,0)});
test('removed draft is not downloadable; Coordinator cannot read unsubmitted evidence',async()=>{finding.proofFiles=[];await assert.rejects(invoke(downloadFindingEvidence,owner),{statusCode:404});finding.proofFiles=[token];await assert.rejects(invoke(downloadFindingEvidence,coordinator),{statusCode:404});assert.equal(reads,0)});
test('active submitted evidence reaches only scoped blob lookup; unrelated Coordinator rejected',async()=>{finding.workflowStatus='submitted_to_coordinator';await assert.rejects(invoke(downloadFindingEvidence,coordinator),{statusCode:404});assert.equal(reads,1);await assert.rejects(invoke(downloadFindingEvidence,{...coordinator,name:'Other'}),{statusCode:403});assert.equal(reads,1)});
test('evidence exclusion appends actor history and invalidates prior verification',async()=>{finding.workflowStatus='submitted_to_coordinator';await invoke(reviewFindingEvidence,coordinator,{drop:true});assert.equal(updates[0].update.$set.coordinatorVerifiedAt,null);assert.equal(updates[0].update.$push.workflowHistory.action,'evidence_excluded');assert.equal(updates[0].filter.coordinatorCompletedAt,null)});
test('Coordinator cannot download new unsubmitted corrective evidence',async()=>{await assert.rejects(invoke(downloadReportActionEvidence,coordinator),{statusCode:404});assert.equal(reads,0)});
test('withdrawn corrective evidence direct URL denied while submission snapshot remains intact',async()=>{report.workflowStatus='action_submitted';report.workflowHistory=[{action:'action_submitted',actionProofFilesSnapshot:[actionToken]}];report.withdrawnActionProofFiles=[{token:actionToken,status:'withdrawn'}];await assert.rejects(invoke(downloadReportActionEvidence,coordinator),{statusCode:404});assert.deepEqual(report.workflowHistory[0].actionProofFilesSnapshot,[actionToken]);assert.equal(reads,0)});
test('draft corrective proof removal is logical; resubmitted proof withdrawal retains identity and status',async()=>{await invoke(withdrawReportActionEvidence,manager);assert.equal(updates[0].update.$push.withdrawnActionProofFiles.status,'draft_removed');report.workflowStatus='returned_to_prakalpa';report.workflowHistory=[{action:'action_submitted',actionProofFilesSnapshot:[actionToken]}];await invoke(withdrawReportActionEvidence,manager);assert.equal(updates[1].update.$push.withdrawnActionProofFiles.status,'withdrawn');assert.equal(updates[1].update.$push.withdrawnActionProofFiles.by,'manager');assert.equal(report.actionProofFiles.length,1);assert.equal(reads,0)});
test('evidence is locked during official action review; unauthorized project denied',async()=>{report.workflowStatus='action_submitted';await assert.rejects(invoke(withdrawReportActionEvidence,manager),{statusCode:409});manager.assignedPrakalpas=['Other'];manager.prakalpa='Other';await assert.rejects(invoke(downloadReportActionEvidence,manager),{statusCode:404});assert.equal(updates.length,0);assert.equal(reads,0)});

test('real evidence routes reject unauthenticated and excluded direct HTTP/file access',async()=>{
 const secret=process.env.JWT_SECRET,oldFindById=User.findById;process.env.JWT_SECRET='isolated-evidence-http-fixture-secret';
 User.findById=id=>({select(){return this},then(resolve,reject){return Promise.resolve({_id:id,role:'audit_coordinator',name:id==='other'?'Other':'Coordinator',active:true,passwordChangedAt:null}).then(resolve,reject)}});
 const app=express();app.use(express.json());app.use('/api/v1/audit-findings',findingRoutes);app.use('/api/v1/reports',reportRoutes);app.use(errorHandler);
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.on('listening',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  finding.workflowStatus='submitted_to_coordinator';finding.evidenceReviews=[{token,leadDropped:true}];
  report.workflowHistory=[{action:'action_submitted',actionProofFilesSnapshot:[actionToken]}];report.withdrawnActionProofFiles=[{token:actionToken,status:'withdrawn'}];
  const findingUrl=`${base}/api/v1/audit-findings/${recordId}/evidence/${fileId}`,reportUrl=`${base}/api/v1/reports/${recordId}/action-evidence/${fileId}`;
  for(const url of [findingUrl,reportUrl]){
   assert.equal((await fetch(url)).status,401);
   assert.equal((await fetch(url,{headers:{Authorization:`Bearer ${jwt.sign({id:'coordinator'},process.env.JWT_SECRET)}`}})).status,404);
   assert.ok([403,404].includes((await fetch(url,{headers:{Authorization:`Bearer ${jwt.sign({id:'other'},process.env.JWT_SECRET)}`}})).status));
  }
  assert.equal(reads,0);assert.equal(updates.length,0);
 }finally{await new Promise(resolve=>server.close(resolve));User.findById=oldFindById;if(secret===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secret;}
});
