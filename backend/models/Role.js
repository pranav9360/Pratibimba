import mongoose from "mongoose";

const permissionSchema = new mongoose.Schema(
  {
    canCreateAuditPlan: {
      type: Boolean,
      default: false,
    },

    canScheduleAudit: {
      type: Boolean,
      default: false,
    },

    canEditReport: {
      type: Boolean,
      default: false,
    },

    canCloseReport: {
      type: Boolean,
      default: false,
    },

    canViewAllReports: {
      type: Boolean,
      default: false,
    },

    canManageRoles: {
      type: Boolean,
      default: false,
    },

    canManageUsers: {
      type: Boolean,
      default: false,
    },

    canViewDashboard: {
      type: Boolean,
      default: true,
    },

    canAddAuditor: {
      type: Boolean,
      default: false,
    },

    // =========================
    // Workflow Permissions
    // =========================

    canAssignAuditCoordinator: {
      type: Boolean,
      default: false,
    },

    canAssignAuditors: {
      type: Boolean,
      default: false,
    },

    canAssignLeadAuditor: {
      type: Boolean,
      default: false,
    },

    canSubmitFindings: {
      type: Boolean,
      default: false,
    },

    canReviewFindings: {
      type: Boolean,
      default: false,
    },

    canSubmitFindingsToCoordinator: {
      type: Boolean,
      default: false,
    },

    canGenerateReport: {
      type: Boolean,
      default: false,
    },

    canSendReportToPrakalpa: {
      type: Boolean,
      default: false,
    },

    canSubmitCorrectiveAction: {
      type: Boolean,
      default: false,
    },

    canVerifyCorrectiveAction: {
      type: Boolean,
      default: false,
    },

    canManagePrakalpas: {
      type: Boolean,
      default: false,
    },

    canManageAdmins: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    permissions: {
      type: permissionSchema,
      default: () => ({}),
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Role", roleSchema);
