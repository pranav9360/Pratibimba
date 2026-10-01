import api from "./api";

export interface RolePermissionPayload {
  canCreateAuditPlan?: boolean;
  canScheduleAudit?: boolean;
  canEditReport?: boolean;
  canCloseReport?: boolean;
  canViewAllReports?: boolean;
  canManageRoles?: boolean;
  canManageUsers?: boolean;
  canViewDashboard?: boolean;
  canAddAuditor?: boolean;

  canAssignAuditCoordinator?: boolean;
  canAssignAuditors?: boolean;
  canAssignLeadAuditor?: boolean;
  canSubmitFindings?: boolean;
  canReviewFindings?: boolean;
  canSubmitFindingsToCoordinator?: boolean;
  canGenerateReport?: boolean;
  canSendReportToPrakalpa?: boolean;
  canSubmitCorrectiveAction?: boolean;
  canVerifyCorrectiveAction?: boolean;
  canManagePrakalpas?: boolean;
  canManageAdmins?: boolean;
}

export async function getRoles() {
  try {
    const res = await api.get("/roles");
    return res.data.data;
  } catch (err) {
    return null;
  }
}

export async function updateRole(
  roleName: string,
  permissions: RolePermissionPayload
) {
  /*
   * The backend update contract is PUT /roles/:id and
   * expects the MongoDB Role _id, while AppContext works
   * with stable role names.
   *
   * Resolve the current role record first, then persist
   * only its permissions through the backend authority.
   */
  const roles = await getRoles();

  if (!Array.isArray(roles)) {
    throw new Error(
      "Unable to resolve backend roles."
    );
  }

  const role = roles.find(
    (candidate: any) =>
      candidate?.name === roleName
  );

  if (!role?._id) {
    throw new Error(
      `Backend role not found: ${roleName}`
    );
  }

  const res = await api.put(
    `/roles/${role._id}`,
    { permissions }
  );

  return res.data.data;
}
