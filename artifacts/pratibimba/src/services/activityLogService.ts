import api from "./api";

export interface AdministrativeActivity {
  _id: string;
  actor: { name: string; email: string };
  target: { name: string; email?: string; entityType?: "user" | "role"; roleId?: string };
  action: "user_role_changed" | "superadmin_account_updated" | "user_account_updated"
    | "role_created" | "role_updated" | "role_deactivated" | "password_changed" | "password_reset";
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  occurredAt: string;
}

export async function getAdministrativeActivity(): Promise<AdministrativeActivity[]> {
  const response = await api.get("/activity-logs");
  return response.data.data;
}
