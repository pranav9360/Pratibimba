import { findingEvidenceStatus } from "../../shared/evidence-status.mjs";
import mongoose from "mongoose";
import multer from "multer";
import { Readable } from "node:stream";
import AuditFinding from "../models/AuditFinding.js";
import AuditorSubmission from "../models/AuditorSubmission.js";
import CoordinatorBatchClosure from "../models/CoordinatorBatchClosure.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../middleware/asyncHandler.js";

const LIMIT = 8 * 1024 * 1024;
const PREFIX = "evidence:";
export const evidenceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: LIMIT, files: 1 } });
const allowed = new Map([["application/pdf","pdf"],["image/png","png"],["image/jpeg","jpg"],["image/webp","webp"]]);
const validSignature = (buffer, mime) => {
  if (mime === "application/pdf") return buffer.subarray(0,5).toString() === "%PDF-";
  if (mime === "image/png") return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (mime === "image/webp") return buffer.subarray(0,4).toString() === "RIFF" && buffer.subarray(8,12).toString() === "WEBP";
  return false;
};
const getContext = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid finding",400);
  const finding = await AuditFinding.findById(req.params.id);
  if (!finding) throw new AppError("Finding not found",404);
  const audit = await ScheduledAudit.findById(finding.scheduledAudit);
  if (!audit) throw new AppError("Scheduled audit not found",409);
  const role = req.user.role, name = String(req.user.name || "").trim();
  const isAuditor = role === "auditor" && String(finding.submittedBy) === String(req.user._id) && ((audit.auditors || []).includes(name) || String(audit.leadAuditor || "").trim() === name);
  const isLead = role === "auditor" && audit.leadAuditor === name;
  const isCoordinator = role === "audit_coordinator" && audit.auditCoordinator === name;
  const isAdmin = role === "admin" || role === "super_admin";
  if (!(isAuditor || isLead || isCoordinator || isAdmin)) throw new AppError("Finding outside your jurisdiction",403);
  return { finding, audit, isAuditor, isLead, isCoordinator, isAdmin };
};
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "findingEvidence" });
export const uploadFindingEvidence = asyncHandler(async (req,res) => {
  const { finding, audit, isAuditor, isLead } = await getContext(req);
  if (!req.file || !allowed.has(req.file.mimetype) || !validSignature(req.file.buffer,req.file.mimetype)) throw new AppError("Upload a valid JPEG, PNG, WebP or PDF",400);
  const originalName = String(req.file.originalname || "evidence").replace(/[\\/\x00-\x1f]/g,"_").slice(0,140);
  const isDraft = isAuditor && finding.workflowStatus === "auditor_draft";
  if ((isDraft || isLead) && await CoordinatorBatchClosure.exists({ scheduledAudit: audit._id })) {
    throw new AppError("The Coordinator has finalized this audit; evidence is locked.", 409);
  }
  if (isDraft && await AuditorSubmission.exists({ scheduledAudit: audit._id, auditor: req.user._id })) {
    throw new AppError("Final batch already submitted; Auditor evidence is locked.", 409);
  }
  const isLeadReview = isLead && finding.workflowStatus === "submitted_to_lead" && (audit.workflowMode || "legacy") === "legacy";
  if (!(isDraft || isLeadReview)) throw new AppError("Evidence can only be uploaded by the owner during draft or assigned Lead during review",409);
  const field = isDraft ? "proofFiles" : "leadEvidenceFiles";
  if ((finding.proofFiles?.length || 0) + (finding.leadEvidenceFiles?.length || 0) >= 20) throw new AppError("Maximum 20 evidence files per finding",400);
  const stream = bucket().openUploadStream(originalName, { contentType:req.file.mimetype, metadata: { findingId: finding._id, uploadedBy:req.user._id, role:isDraft?"auditor":"lead_auditor", sha256:(await import("node:crypto")).createHash("sha256").update(req.file.buffer).digest("hex") } });
  try { await new Promise((resolve,reject)=>{ Readable.from(req.file.buffer).pipe(stream).on("finish",resolve).on("error",reject); }); }
  catch(err) { throw new AppError("Evidence storage failed",500); }
  const token = PREFIX + String(stream.id);
  // Conditional update prevents an upload being attached after submission/approval.
  const updated = await AuditFinding.findOneAndUpdate({ _id:finding._id, workflowStatus:isDraft?"auditor_draft":"submitted_to_lead", [field]: { $not: { $size: 20 } } }, { $addToSet:{ [field]:token }, $push:{ workflowHistory:{ action:"evidence_uploaded",fromStatus:finding.workflowStatus,toStatus:finding.workflowStatus,performedBy:req.user._id,performedByName:req.user.name,role:req.user.role,remarks:`${isDraft?"Auditor":"Lead Auditor"} uploaded ${originalName}`,performedAt:new Date() } } },{new:true});
  if (!updated) { await bucket().delete(stream.id); throw new AppError("Finding changed during upload; retry",409); }
  res.status(201).json({ success:true, data:{ id:token, name:originalName, contentType:req.file.mimetype, size:req.file.size } });
});
export const reviewFindingEvidence = asyncHandler(async (req,res) => {
  const { finding, audit, isLead, isCoordinator } = await getContext(req);
  const token = PREFIX + req.params.fileId;
  if (!mongoose.isValidObjectId(req.params.fileId) ||
      ![...(finding.proofFiles||[]),...(finding.leadEvidenceFiles||[])].includes(token))
    throw new AppError("Evidence not found",404);
  if (typeof req.body?.drop !== "boolean") throw new AppError("drop must be boolean",400);
  const lead = isLead && finding.workflowStatus === "submitted_to_lead" && (audit.workflowMode || "legacy") === "legacy";
  const coordinator = isCoordinator && finding.workflowStatus === "submitted_to_coordinator" && !finding.coordinatorCompletedAt;
  if (!lead && !coordinator) throw new AppError("Evidence review is not permitted at this stage",409);
  const stage = lead ? "lead" : "coordinator";
  const field = stage + "Dropped";
  const who = stage + "ReviewedBy";
  const when = stage + "ReviewedAt";
  const current = (finding.evidenceReviews || []).find(r => r.token === token);
  if (coordinator && current?.leadDropped) throw new AppError("Lead-excluded evidence cannot be restored by Coordinator",409);
  const now = new Date();
  // Atomic stage-guarded update. First review inserts a record, subsequent review updates it.
  const filter = { _id: finding._id, workflowStatus: lead ? "submitted_to_lead" : "submitted_to_coordinator", ...(coordinator ? {coordinatorCompletedAt: null} : {}), ...(!current ? {"evidenceReviews.token": {$ne: token}} : {}) };
  const update = current
    ? { $set: { [`evidenceReviews.$[review].${field}`]: req.body.drop, [`evidenceReviews.$[review].${who}`]: req.user._id, [`evidenceReviews.$[review].${when}`]: now } }
    : { $push: { evidenceReviews: { token, [field]: req.body.drop, [who]: req.user._id, [when]: now } } };
  const options = current ? { new: true, arrayFilters: [{ "review.token": token }] } : { new: true };
  if (coordinator) update.$set = { ...(update.$set || {}), coordinatorVerifiedAt: null };
  update.$push = { ...(update.$push || {}), workflowHistory: {
    action: req.body.drop ? "evidence_excluded" : "evidence_restored", fromStatus: finding.workflowStatus,
    toStatus: finding.workflowStatus, performedBy: req.user._id, performedByName: req.user.name,
    role: req.user.role, remarks: `${stage} ${req.body.drop ? "excluded" : "restored"} ${token}`, performedAt: now,
  } };
  const updated = await AuditFinding.findOneAndUpdate(filter, update, options);
  if (!updated) throw new AppError("Finding changed; reload before reviewing",409);
  res.json({ success:true, data:updated.evidenceReviews });
});
export const downloadFindingEvidence = asyncHandler(async (req,res) => {
  const { finding, isCoordinator } = await getContext(req);
  const token = PREFIX + req.params.fileId;
  if (findingEvidenceStatus(finding, token) !== "active") throw new AppError("Evidence is excluded or unavailable in the active viewer.", 404);
  if (isCoordinator && !["submitted_to_coordinator", "converted_to_report", "discarded_by_coordinator"].includes(finding.workflowStatus)) throw new AppError("Evidence not yet submitted for Coordinator review.", 404);
  if (![...(finding.proofFiles||[]),...(finding.leadEvidenceFiles||[])].includes(token) || !mongoose.isValidObjectId(req.params.fileId)) throw new AppError("Evidence not found",404);
  const fileId = new mongoose.Types.ObjectId(req.params.fileId);
  const file = await mongoose.connection.db.collection("findingEvidence.files").findOne({ _id:fileId, "metadata.findingId":finding._id });
  if (!file) throw new AppError("Evidence not found",404);
  res.setHeader("Content-Type",file.contentType || "application/octet-stream");
  res.setHeader("Content-Disposition",`inline; filename="${String(file.filename).replace(/["\\\r\n]/g,"_")}"`);
  res.setHeader("Cache-Control","private, no-store");
  bucket().openDownloadStream(fileId).on("error",()=>{if(!res.headersSent)res.status(500).end();else res.destroy();}).pipe(res);
});

// Logical draft removal only; originals remain in GridFS and an immutable history event.
export const removeDraftFindingEvidence = asyncHandler(async (req, res) => {
  const { finding, audit, isAuditor } = await getContext(req);
  const token = PREFIX + req.params.fileId;
  if (!mongoose.isValidObjectId(req.params.fileId) || !finding.proofFiles?.includes(token)) throw new AppError("Evidence not found", 404);
  if (!isAuditor || finding.workflowStatus !== "auditor_draft" || finding.status !== "DRAFT") throw new AppError("Only your unsubmitted draft evidence can be removed.", 409);
  if (await AuditorSubmission.exists({ scheduledAudit: audit._id, auditor: req.user._id }) || await CoordinatorBatchClosure.exists({ scheduledAudit: audit._id })) throw new AppError("Submitted evidence is locked.", 409);
  const now = new Date();
  const updated = await AuditFinding.findOneAndUpdate({ _id: finding._id, workflowStatus: "auditor_draft", status: "DRAFT", proofFiles: token }, {
    $pull: { proofFiles: token }, $push: { withdrawnEvidenceFiles: { token, by: req.user._id, at: now },
      workflowHistory: { action: "draft_evidence_removed", fromStatus: finding.workflowStatus, toStatus: finding.workflowStatus,
        performedBy: req.user._id, performedByName: req.user.name, role: req.user.role, remarks: token, performedAt: now } },
  }, { new: true });
  if (!updated) throw new AppError("Finding changed; refresh before removing evidence.", 409);
  res.json({ success: true });
});
