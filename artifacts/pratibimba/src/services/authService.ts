import api from "./api";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role:
    | "super_admin"
    | "admin"
    | "lead_auditor"
    | "audit_coordinator"
    | "auditor"
    | "prakalpa_manager";
  prakalpa?: string;
  assignedPrakalpas?: string[];
}

/*
 * The backend /auth/me endpoint is the authoritative
 * source of authenticated identity and role.
 */
export const getAuthenticatedUser =
  async (): Promise<AuthenticatedUser> => {
    const response =
      await api.get("/auth/me");

    const user =
      response.data?.data ??
      response.data;

    if (
      !user ||
      !user.id ||
      !user.name ||
      !user.email ||
      !user.role
    ) {
      throw new Error(
        "Authenticated user response is incomplete."
      );
    }

    return user as AuthenticatedUser;
  };

export const hasAuthenticationToken = () =>
  Boolean(
    localStorage.getItem("token")
  );

export const clearAuthenticatedSession = () => {
  localStorage.removeItem("token");

  /*
   * Older login code stores this copy.
   * It is not authoritative and must not survive
   * an invalid authenticated session.
   */
  localStorage.removeItem("user");

};
