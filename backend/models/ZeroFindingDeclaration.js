import mongoose from 'mongoose';

/**
 * Dedicated zero-finding declaration, separate from AuditFinding and Report.
 * Integration must use an audit-scoped transaction and check for any findings.
 */
const historySchema = new mongoose.Schema({
  action: { type: String, enum: ['submitted', 'approved', 'returned'], required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, trim: true, default: '' },
  role: { type: String, trim: true, default: '' },
  remark: { type: String, trim: true, default: '' },
  at: { type: Date, default: Date.now, required: true },
}, { _id: false });

const schema = new mongoose.Schema({
  scheduledAudit: { type: mongoose.Schema.Types.ObjectId, ref: 'ScheduledAudit', required: true, unique: true },
  leadAuditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workCompletedAt: { type: Date, default: null },
  remark: { type: String, trim: true, required: true, maxlength: 4000 },
  status: { type: String, enum: ['submitted', 'approved', 'returned'], default: 'submitted', required: true },
  coordinator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  coordinatorRemark: { type: String, trim: true, default: '', maxlength: 4000 },
  approvedAt: { type: Date, default: null },
  history: { type: [historySchema], default: [] },
}, { timestamps: true });

export default mongoose.models.ZeroFindingDeclaration || mongoose.model('ZeroFindingDeclaration', schema);
