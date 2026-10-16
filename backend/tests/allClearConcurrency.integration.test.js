import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import AuditPlan from '../models/AuditPlan.js';
import ScheduledAudit from '../models/ScheduledAudit.js';
import AuditFinding from '../models/AuditFinding.js';
import ConsolidatedFinding from '../models/ConsolidatedFinding.js';
import ConsolidatedFindingSourceClaim from '../models/ConsolidatedFindingSourceClaim.js';
import AuditorSubmission from '../models/AuditorSubmission.js';
import LeadBatchSubmission from '../models/LeadBatchSubmission.js';
import CoordinatorBatchClosure from '../models/CoordinatorBatchClosure.js';
import ZeroFindingDeclaration from '../models/ZeroFindingDeclaration.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { submitZeroFinding, decideZeroFinding } from '../services/zeroFindingWorkflowService.js';
import { createAuditFindingDraft, submitAllAuditorFindings } from '../services/auditFindingService.js';
import { updateScheduledAudit, completeScheduledAudit } from '../services/scheduledAuditService.js';

// Explicit opt-in only. Never read MONGO_URI or connect to Atlas. The dedicated
// disposable LOCAL replica-set database is the only database these tests accept.
const uri = process.env.ALL_CLEAR_TEST_MONGO_URI;
const models = [AuditPlan,ScheduledAudit,AuditFinding,ConsolidatedFinding,ConsolidatedFindingSourceClaim,AuditorSubmission,LeadBatchSubmission,CoordinatorBatchClosure,ZeroFindingDeclaration,Report,User];
let connected=false, audit, lead, coordinator;
before(async()=>{
 if(!uri)return;
 const parsed=new URL(uri);
 if(parsed.protocol!=='mongodb:' || !['127.0.0.1','localhost','[::1]'].includes(parsed.hostname) || parsed.pathname!=='/pratibimba_all_clear_test')throw new Error('All Clear integration tests require the dedicated local pratibimba_all_clear_test replica-set database.');
 await mongoose.connect(uri,{serverSelectionTimeoutMS:5000});connected=true;
 const hello=await mongoose.connection.db.admin().command({hello:1});
 if(!hello.setName)throw new Error('An isolated MongoDB replica set is required.');
 for(const model of models)await model.init();
});
beforeEach(async()=>{
 if(!connected)return;
 for(const model of models)await model.deleteMany({});
 lead={_id:new mongoose.Types.ObjectId(),role:'auditor',name:'Fixture Lead'};
 coordinator={_id:new mongoose.Types.ObjectId(),role:'audit_coordinator',name:'Fixture Coordinator'};
 await User.collection.insertOne({...lead,email:'lead@example.test',active:true});
 const plan=await AuditPlan.create({iqaNumber:'IQA-2026-0001',prakalpa:'Fixture',auditCoordinator:coordinator.name,prakalphaPramukh:'Fixture Manager',auditPlannedDate:new Date(Date.now()-86400000),status:'scheduled',auditors:[lead.name]});
 audit=await ScheduledAudit.create({auditPlan:plan._id,iqaNumber:plan.iqaNumber,prakalpa:'Fixture',location:'Fixture Office',auditCoordinator:coordinator.name,leadAuditor:lead.name,auditors:[lead.name],auditAreas:['Safety'],workflowMode:'legacy',status:'ongoing',startDate:new Date(Date.now()-86400000),endDate:new Date(Date.now()-1000)});
});
after(async()=>{if(connected)await mongoose.disconnect()});
const payload={remark:'All Auditor work reviewed; no findings.',workCompleted:true};
async function zeroResponse(){await submitAllAuditorFindings(audit._id,lead)}
async function assertNoFakeOutcomes(){assert.equal(await Report.countDocuments({}),0);assert.equal(await ConsolidatedFinding.countDocuments({}),0)}
test('isolated replica set: simultaneous declaration retries issue one declaration/history event',{skip:!uri},async()=>{
 await zeroResponse();const results=await Promise.allSettled([submitZeroFinding(audit._id,lead,payload),submitZeroFinding(audit._id,lead,payload)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const declaration=await ZeroFindingDeclaration.findOne({scheduledAudit:audit._id});assert.equal(declaration.history.length,1);await assertNoFakeOutcomes();
});
test('isolated replica set: draft versus final zero response cannot yield a false All Clear',{skip:!uri},async()=>{
 await Promise.allSettled([createAuditFindingDraft(audit._id,{description:'Real finding',classification:'NC'},lead),zeroResponse()]);
 const count=await AuditFinding.countDocuments({scheduledAudit:audit._id});
 if(count){await assert.rejects(submitZeroFinding(audit._id,lead,payload),{statusCode:409});assert.equal(await ZeroFindingDeclaration.countDocuments({}),0)}
 else{await submitZeroFinding(audit._id,lead,payload);await decideZeroFinding(audit._id,coordinator,{decision:'approve'});await completeScheduledAudit(audit._id,coordinator);assert.equal((await ScheduledAudit.findById(audit._id)).outcome,'all_clear')}
 await assertNoFakeOutcomes();
});
test('isolated replica set: reschedule versus declaration cannot commit a future-ended pending All Clear',{skip:!uri},async()=>{
 await zeroResponse();await Promise.allSettled([updateScheduledAudit(audit._id,{endDate:new Date(Date.now()+86400000)},coordinator),submitZeroFinding(audit._id,lead,payload)]);
 const stored=await ScheduledAudit.findById(audit._id), declaration=await ZeroFindingDeclaration.findOne({scheduledAudit:audit._id});
 assert.ok(!declaration || stored.endDate.getTime()<=Date.now());await assertNoFakeOutcomes();
});
