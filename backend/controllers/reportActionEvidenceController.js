import { actionEvidenceStatus, submittedActionEvidence, activeActionProofFiles } from "../../shared/evidence-status.mjs";
import mongoose from "mongoose";
import multer from "multer";
import { Readable } from "node:stream";
import { createHash } from "node:crypto";
import Report from "../models/Report.js";
import ScheduledAudit from "../models/ScheduledAudit.js";
import AppError from "../utils/AppError.js";
import { authorizedManagerPrakalpas } from "../services/managerAssignments.js";
import asyncHandler from "../middleware/asyncHandler.js";

const MAX_SIZE = 8 * 1024 * 1024;
const PREFIX = "action-evidence:";
export const actionEvidenceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_SIZE, files: 1 } });
const supported = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
function signatureMatches(buffer, mime) {
  if (!buffer || buffer.length < 12) return false;
  if (mime === "application/pdf") return buffer.subarray(0,5).toString() === "%PDF-";
  if (mime === "image/png") return buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/jpeg") return buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255;
  if (mime === "image/webp") return buffer.subarray(0,4).toString() === "RIFF" && buffer.subarray(8,12).toString() === "WEBP";
  return false;
}
const bucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "reportActionEvidence" });
async function context(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Invalid report", 400);
  const report = await Report.findById(req.params.id);
  if (!report) throw new AppError("Report not found", 404);
  const audit = await ScheduledAudit.findById(report.scheduledAudit);
  if (!audit) throw new AppError("Scheduled Audit not found", 409);
  const user = req.user;
  const isManager = user.role === "prakalpa_manager" && (await authorizedManagerPrakalpas(user)).includes(String(audit.prakalpa).trim());
  const isCoordinator = user.role === "audit_coordinator" && Boolean(user.name) && String(user.name).trim() === String(audit.auditCoordinator).trim();
  if (!isManager && !isCoordinator) throw new AppError("Report not found", 404);
  return { report, audit, isManager, isCoordinator };
}
export const uploadReportActionEvidence = asyncHandler(async (req, res) => {
  const { report, isManager } = await context(req);
  if (!isManager || !["sent_to_prakalpa", "returned_to_prakalpa"].includes(report.workflowStatus)) throw new AppError("Evidence upload is only available before submitting corrective action", 409);
  if (!req.file || !supported.has(req.file.mimetype) || !signatureMatches(req.file.buffer, req.file.mimetype)) throw new AppError("Upload a valid PDF, PNG, JPEG or WebP", 400);
  if (activeActionProofFiles(report).length >= 10) throw new AppError("Maximum 10 corrective-action proof files", 400);
  const filename = String(req.file.originalname || "proof").replace(/[\\/\x00-\x1f]/g, "_").slice(0,140);
  const stream = bucket().openUploadStream(filename, { contentType: req.file.mimetype, metadata: { reportId: report._id, uploadedBy: req.user._id, sha256: createHash("sha256").update(req.file.buffer).digest("hex") } });
  await new Promise((resolve,reject) => Readable.from(req.file.buffer).pipe(stream).on("finish",resolve).on("error",reject));
  const token = PREFIX + String(stream.id);
  const updated = await Report.findOneAndUpdate({ _id: report._id, workflowStatus: { $in: ["sent_to_prakalpa", "returned_to_prakalpa"] }, $expr: { $lt: [{ $size: { $filter: { input: { $ifNull: ["$actionProofFiles", []] }, as: "token", cond: { $not: [{ $in: ["$$token", { $map: { input: { $ifNull: ["$withdrawnActionProofFiles", []] }, as: "item", in: "$$item.token" } }] }] } } } }, 10] } }, { $addToSet: { actionProofFiles: token } }, { new: true });
  if (!updated) { await bucket().delete(stream.id); throw new AppError("Report changed during upload",409); }
  res.status(201).json({ success:true, data:{ token, name:filename } });
});
export const downloadReportActionEvidence = asyncHandler(async (req,res) => {
  const { report, isCoordinator } = await context(req);
  const id = req.params.fileId;
  if (!mongoose.isValidObjectId(id) || !(report.actionProofFiles || []).includes(PREFIX + id)) throw new AppError("Evidence not found",404);
  if (actionEvidenceStatus(report, PREFIX + id) !== "active" || (isCoordinator && !submittedActionEvidence(report, PREFIX + id))) throw new AppError("Evidence not available in active review", 404);
  const objectId = new mongoose.Types.ObjectId(id);
  const file = await mongoose.connection.db.collection("reportActionEvidence.files").findOne({ _id:objectId, "metadata.reportId":report._id });
  if (!file) throw new AppError("Evidence not found",404);
  res.setHeader("Content-Type",file.contentType || "application/octet-stream");
  res.setHeader("Content-Disposition",`inline; filename="${String(file.filename).replace(/["\\\r\n]/g,"_")}"`);
  res.setHeader("Cache-Control","private, no-store");
  bucket().openDownloadStream(objectId).on("error",()=>{if(!res.headersSent)res.status(500).end();else res.destroy();}).pipe(res);
});

export const withdrawReportActionEvidence = asyncHandler(async (req, res) => {
  const { report, isManager } = await context(req);
  const token = PREFIX + req.params.fileId;
  if (!isManager || !["sent_to_prakalpa", "returned_to_prakalpa"].includes(report.workflowStatus)) throw new AppError("Evidence changes are only allowed before submitting or while revising corrective action.", 409);
  if (!mongoose.isValidObjectId(req.params.fileId) || !report.actionProofFiles?.includes(token)) throw new AppError("Evidence not found", 404);
  if (actionEvidenceStatus(report, token) !== "active") throw new AppError("Evidence already removed or withdrawn", 409);
  const status = submittedActionEvidence(report, token) ? "withdrawn" : "draft_removed";
  const now = new Date();
  const updated = await Report.findOneAndUpdate({ _id: report._id, workflowStatus: report.workflowStatus,
    "withdrawnActionProofFiles.token": { $ne: token } }, { $push: {
      withdrawnActionProofFiles: { token, status, by: req.user._id, at: now },
      workflowHistory: { action: "action_evidence_" + status, fromStatus: report.workflowStatus, toStatus: report.workflowStatus,
        performedBy: req.user._id, performedByName: req.user.name, role: req.user.role, remarks: token, performedAt: now },
    } }, { new: true });
  if (!updated) throw new AppError("Report changed; refresh before removing evidence.", 409);
  res.json({ success: true, data: updated });
});
