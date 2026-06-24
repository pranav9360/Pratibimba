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

export type Prakalpa = {
  _id: string;
  name: string;
  prakalpaPramukh?: string;
  prakalpaPramukhEmail?: string;
  pramukhSeniorEmail?: string;
  auditors?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type Location = {
  _id: string;
  name: string;
  prakalpaId: string | Prakalpa;
  createdAt?: string;
  updatedAt?: string;
};

export type AuditPlan = {
  _id: string;
  auditId: string;
  prakalpaId: string | Prakalpa;
  locationId?: string | Location | null;
  auditPlannedDate?: string;
  expectedEndDate?: string;
  auditCoordinator?: string;
  auditPurpose?: string;
  mostProbableAuditor?: string;
  auditAreas?: string[];
  planPassword?: string;
  status?: "planned" | "scheduled" | "cancelled";
  createdAt?: string;
  updatedAt?: string;
};

export type ScheduledAudit = {
  _id: string;
  auditId?: string;
  auditPlanId?: string | AuditPlan | null;
  prakalpaId: string | Prakalpa;
  locationId?: string | Location | null;
  auditPlannedDate?: string;
  auditStartDate?: string;
  auditEndDate?: string;
  auditCoordinator?: string;
  finalizedAuditor?: string;
  auditPurpose?: string;
  auditAreas?: string[];
  status?: "scheduled" | "in_progress" | "completed";
  createdAt?: string;
  updatedAt?: string;
};

export type Report = {
  _id: string;
  reportId: string;
  auditId?: string;
  scheduledAuditId?: string | ScheduledAudit | null;
  prakalpaId?: string | Prakalpa | null;
  locationId?: string | Location | null;
  internalAuditDate?: string;
  timeVisited?: string;
  auditArea?: string;
  auditFindings?: string;
  classification?: "OFI" | "NC";
  status?: "open" | "closed";
  correctiveAction?: string;
  actionTakenByManager?: string;
  dateClosed?: string;
  dueDate?: string;
  proofUrl?: string;
  checklistUrl?: string;
  iqaReportPdfUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreatePrakalpaPayload = {
  name: string;
  prakalpaPramukh?: string;
  prakalpaPramukhEmail?: string;
  pramukhSeniorEmail?: string;
  auditors?: string[];
};

export type CreateLocationPayload = {
  name: string;
};

export type CreateAuditPlanPayload = {
  prakalpaId: string;
  locationId?: string;
  auditPlannedDate: string;
  expectedEndDate?: string;
  auditCoordinator: string;
  auditPurpose: string;
  mostProbableAuditor: string;
  auditAreas: string[];
  planPassword: string;
};

export type ScheduleAuditPayload = {
  startDate: string;
  endDate: string;
  finalAuditor: string;
};

export type UpdateScheduledAuditPayload = {
  auditStartDate?: string;
  auditEndDate?: string;
  finalizedAuditor?: string;
  auditPurpose?: string;
  status?: "scheduled" | "in_progress" | "completed";
};

export type UpdateReportPayload = {
  internalAuditDate?: string;
  timeVisited?: string;
  auditArea?: string;
  auditFindings?: string;
  classification?: "OFI" | "NC";
  status?: "open" | "closed";
  correctiveAction?: string;
  actionTakenByManager?: string;
  dateClosed?: string;
  dueDate?: string;
};

export type CreateReportPayload = {
  scheduledAuditId: string;
  internalAuditDate: string;
  timeVisited: string;
  auditArea?: string;
  auditFindings: string;
  classification: "OFI" | "NC";
  dueDate?: string;
  proofUrl?: string;
  checklistUrl?: string;
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
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...authHeaders(),
    ...(options.headers as Record<string, string> | undefined)
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
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

export function getPrakalpas() {
  return apiRequest<Prakalpa[]>("/api/prakalpas");
}

export function createPrakalpa(payload: CreatePrakalpaPayload) {
  return apiRequest<Prakalpa>("/api/prakalpas", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getLocationsByPrakalpa(prakalpaId: string) {
  return apiRequest<Location[]>(`/api/prakalpas/${prakalpaId}/locations`);
}

export function createLocation(
  prakalpaId: string,
  payload: CreateLocationPayload
) {
  return apiRequest<Location>(`/api/prakalpas/${prakalpaId}/locations`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getAuditPlans() {
  return apiRequest<AuditPlan[]>("/api/audit-plans");
}

export function createAuditPlan(payload: CreateAuditPlanPayload) {
  return apiRequest<AuditPlan>("/api/audit-plans", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function scheduleAuditPlan(planId: string, payload: ScheduleAuditPayload) {
  return apiRequest<ScheduledAudit>(`/api/audit-plans/${planId}/schedule`, {
    method: "POST",
    body: JSON.stringify({
      startDate: payload.startDate,
      endDate: payload.endDate,
      finalAuditor: payload.finalAuditor,
      auditStartDate: payload.startDate,
      auditEndDate: payload.endDate,
      finalizedAuditor: payload.finalAuditor
    })
  });
}

export function getScheduledAudits() {
  return apiRequest<ScheduledAudit[]>("/api/scheduled-audits");
}

export function updateScheduledAudit(
  scheduledAuditId: string,
  payload: UpdateScheduledAuditPayload
) {
  return apiRequest<ScheduledAudit>(`/api/scheduled-audits/${scheduledAuditId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function getReports() {
  return apiRequest<Report[]>("/api/reports");
}

export function getOpenReports() {
  return apiRequest<Report[]>("/api/reports/open/list");
}

export function createReport(payload: CreateReportPayload) {
  return apiRequest<Report>("/api/reports", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateReport(reportId: string, payload: UpdateReportPayload) {
  return apiRequest<Report>(`/api/reports/${reportId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export function saveAuth(auth: LoginResponse) {
  localStorage.setItem("pratibimba_token", auth.token);
  localStorage.setItem("pratibimba_user", JSON.stringify(auth.user));
}

export function logoutUser() {
  localStorage.removeItem("pratibimba_token");
  localStorage.removeItem("pratibimba_user");
}