const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export type LoginPayload = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "chief_auditor" | "auditor" | "prakalpa_manager";
  prakalpaId?: string | null;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type DashboardStats = {
  assessmentYear: number | string;
  numberOfPrakalpas: number;
  numberOfPrakalpasWithAuditScope: number;
  iqaCoverage: number;
  numberOfAuditsPlanned: number;
  avgAuditsPerPrakalpa: number;
  auditsScheduled: number;
  auditsCompleted: number;
  totalReports: number;
  totalNCsReported: number;
  totalOFIReported: number;
  ncsInOpenStatus: number;
  ncsClosed: number;
  ncClosedPercentage: number;
  overdueNCs: number;
  overdueNCsPercentage: number;
  closureRate: number;
};

export function getToken() {
  return localStorage.getItem("pratibimba_token");
}

export function authHeaders(): Record<string, string> {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined)
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data as T;
}

export function loginUser(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getDashboardStats() {
  return apiRequest<DashboardStats>("/api/dashboard");
}

export function saveAuth(auth: LoginResponse) {
  localStorage.setItem("pratibimba_token", auth.token);
  localStorage.setItem("pratibimba_user", JSON.stringify(auth.user));
}

export function logoutUser() {
  localStorage.removeItem("pratibimba_token");
  localStorage.removeItem("pratibimba_user");
}