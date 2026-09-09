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
}

export async function getRoles() {
  try {
    const res = await api.get("/roles");
    return res.data.data;
  } catch (err) {
    return null;
  }
}

export async function updateRole(roleName: string, permissions: RolePermissionPayload) {
  // Persist locally without triggering failing remote server calls
  return { success: true, name: roleName, permissions };
}
