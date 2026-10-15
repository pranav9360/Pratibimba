import api from "./api";


export interface AuditFinding {
  _id: string;
  id?: string;

  scheduledAudit: string | { _id: string };
  auditPlan?: string;

  iqaNumber?: string;
  prakalpa?: string;
  location?: string;
  sublocation?: string;

  auditArea?: string;
  severity:
    | "open_for_improvement"
    | "non_conformance";

  description?: string;
  findings: string;
  classification?: "NC" | "OFI" | string;
  status?: string;

  proofFiles?: string[];
  leadEvidenceFiles?: string[];
  evidenceReviews?: Array<{ token: string; leadDropped?: boolean; coordinatorDropped?: boolean; }>;
  hasChecklist?: boolean;

  visitDate?: string;
  visitTime?: string;

  submittedBy?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
  submittedByName?: string;

  leadAuditor?: string;
  auditCoordinator?: string;

  workflowStatus:
    | "auditor_draft"
    | "submitted_to_lead"
    | "returned_to_auditor"
    | "approved_by_lead"
    | "submitted_to_coordinator"
    | string;

  leadRemarks?: string;
  returnRemarks?: string;
  leadReviewRemarks?: string;
  coordinatorEditedCopy?: {
    findings?: string;
    severity?: "open_for_improvement" | "non_conformance";
    revision?: number;
    editedAt?: string;
  };
  coordinatorVerifiedAt?: string | null;
  coordinatorCompletedAt?: string | null;
  leadEditedCopy?: {
    findings?: string;
    severity?: "open_for_improvement" | "non_conformance";
    revision?: number;
    editedAt?: string;
  };

  submittedToLeadAt?: string;
  returnedToAuditorAt?: string;
  resubmittedToLeadAt?: string;
  approvedByLeadAt?: string;
  leadReviewedAt?: string;
  submittedToCoordinatorAt?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface ConsolidatedFinding {
  _id: string;
  scheduledAudit: string;
  iqaNumber?: string;
  title: string;
  description?: string;
  supportingNotes?: string;
  classification?: "NC" | "OFI" | string;
  coordinatorClassification?: "NC" | "OFI" | null;
  coordinatorClassificationReviewedAt?: string | null;
  coordinatorClassificationReviewedBy?: string | null;
  report?: string | null;
  convertedToReportAt?: string | null;
  status: string;
  workflowStatus: string;
  sourceFindings: Array<AuditFinding | string>;
  submittedBy?: {
    _id?: string;
    name?: string;
    email?: string;
  } | string;
  submittedAt?: string;
  submittedToCoordinatorAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ConsolidatedFindingPayload {
  title: string;
  description: string;
  supportingNotes: string;
  classification: "NC" | "OFI";
  sourceFindings: string[];
}


function unwrap<T>(response: any): T {
  /*
   * Backend ApiResponse stores the actual result in `data`.
   *
   * Keeping unwrapping here prevents individual pages from
   * depending on the backend response envelope.
   */
  return response.data != null &&
    Object.prototype.hasOwnProperty.call(response.data, "data")
      ? response.data.data
      : response.data;
}


/*
 * Fetch findings visible to the authenticated user.
 *
 * Backend jurisdiction remains authoritative:
 *
 * Auditor      -> own findings
 * Lead Auditor -> findings for assigned audits
 * Coordinator  -> coordinator-visible findings
 * Admin        -> administrative visibility
 */
export async function getAuditFindings(
  scope: "mine" | "review" = "mine"
): Promise<AuditFinding[]> {

  const response =
    await api.get(
      "/audit-findings",
      { params: { scope } }
    );

  return unwrap<AuditFinding[]>(
    response
  );
}


export async function getScheduledAuditFindings(
  scheduledAuditId: string
): Promise<AuditFinding[]> {
  const response =
    await api.get(
      `/audit-findings/scheduled-audits/${scheduledAuditId}/findings`
    );

  return unwrap<AuditFinding[]>(
    response
  );
}

export async function getEligibleSubmittedFindingsForAudit(
  scheduledAuditId: string
): Promise<AuditFinding[]> {
  const response = await api.get(
    `/audit-findings/scheduled-audits/${scheduledAuditId}/consolidated-findings/eligible`
  );

  return unwrap<AuditFinding[]>(response);
}

export async function getConsolidatedFindingsForAudit(
  scheduledAuditId: string
): Promise<ConsolidatedFinding[]> {
  const response = await api.get(
    `/audit-findings/scheduled-audits/${scheduledAuditId}/consolidated-findings`
  );

  return unwrap<ConsolidatedFinding[]>(response);
}

export async function createConsolidatedFinding(
  scheduledAuditId: string,
  payload: ConsolidatedFindingPayload
): Promise<ConsolidatedFinding> {
  const response = await api.post(
    `/audit-findings/scheduled-audits/${scheduledAuditId}/consolidated-findings`,
    payload
  );

  return unwrap<ConsolidatedFinding>(response);
}

export async function updateConsolidatedFinding(
  findingId: string,
  payload: ConsolidatedFindingPayload
): Promise<ConsolidatedFinding> {
  const response = await api.patch(
    `/audit-findings/consolidated-findings/${findingId}`,
    payload
  );

  return unwrap<ConsolidatedFinding>(response);
}

export async function submitAllConsolidatedFindingsForAudit(
  scheduledAuditId: string,
  request: LeadHandoverRequest
): Promise<ConsolidatedFinding[]> {
  const response = await api.post(
    `/audit-findings/scheduled-audits/${scheduledAuditId}/consolidated-findings/submit-all`,
    request
  );

  return unwrap<ConsolidatedFinding[]>(response);
}

export async function submitConsolidatedFinding(
  findingId: string
): Promise<ConsolidatedFinding> {
  const response = await api.post(
    `/audit-findings/consolidated-findings/${findingId}/submit`
  );

  return unwrap<ConsolidatedFinding>(response);
}


export async function createAuditFindingDraft(
  scheduledAuditId: string,
  payload: {
    description?: string;
    classification?: "NC" | "OFI" | "" | null;
  }
): Promise<AuditFinding> {
  const response =
    await api.post(
      `/audit-findings/scheduled-audits/${scheduledAuditId}/findings`,
      payload
    );

  return unwrap<AuditFinding>(
    response
  );
}


export async function updateAuditFindingDraft(
  scheduledAuditId: string,
  findingId: string,
  payload: {
    description?: string;
    classification?: "NC" | "OFI" | "" | null;
  }
): Promise<AuditFinding> {
  const response =
    await api.patch(
      `/audit-findings/scheduled-audits/${scheduledAuditId}/findings/${findingId}`,
      payload
    );

  return unwrap<AuditFinding>(
    response
  );
}


export async function submitAuditFindingDraft(
  scheduledAuditId: string,
  findingId: string
): Promise<AuditFinding> {
  const response =
    await api.post(
      `/audit-findings/scheduled-audits/${scheduledAuditId}/findings/${findingId}/submit`
    );

  return unwrap<AuditFinding>(
    response
  );
}


/*
 * Fetch one finding.
 *
 * Backend intentionally returns 404 when the finding is outside
 * the authenticated user's jurisdiction.
 */
export async function getAuditFindingById(
  id: string
): Promise<AuditFinding> {

  const response =
    await api.get(
      `/audit-findings/${id}`
    );

  return unwrap<AuditFinding>(
    response
  );
}


/*
 * Auditor submits a finding to the Lead Auditor.
 */
export async function submitAuditFinding(
  payload: Record<string, unknown>
): Promise<AuditFinding> {

  const response =
    await api.post(
      "/audit-findings/submit-to-lead",
      payload
    );

  return unwrap<AuditFinding>(
    response
  );
}


/*
 * Lead Auditor returns a finding to its original Auditor.
 */
export async function returnAuditFindingToAuditor(
  id: string,
  payload: Record<string, unknown>
): Promise<AuditFinding> {

  const response =
    await api.patch(
      `/audit-findings/${id}/return-to-auditor`,
      payload
    );

  return unwrap<AuditFinding>(
    response
  );
}


/*
 * Original Auditor corrects and resubmits a returned finding.
 */
export async function resubmitAuditFindingToLead(
  id: string,
  payload: Record<string, unknown>
): Promise<AuditFinding> {

  const response =
    await api.patch(
      `/audit-findings/${id}/resubmit-to-lead`,
      payload
    );

  return unwrap<AuditFinding>(
    response
  );
}


/*
 * Lead Auditor approves a finding and submits it to the
 * Audit Coordinator.
 */
export async function saveLeadFindingCopy(
  id: string,
  payload: { findings: string; severity: "open_for_improvement" | "non_conformance"; revision: number }
): Promise<AuditFinding> {
  const response = await api.patch(`/audit-findings/${id}/lead-edit`, payload);
  return unwrap<AuditFinding>(response);
}

export async function approveAuditFinding(
  id: string,
  payload: Record<string, unknown> = {}
): Promise<AuditFinding> {

  const response =
    await api.patch(
      `/audit-findings/${id}/approve`,
      payload
    );

  return unwrap<AuditFinding>(
    response
  );
}


/*
 * Audit Coordinator generates the official IQR.
 *
 * The backend creates the Report and controls the official
 * IQR number.
 */
export type CoordinatorFindingSummary = { scheduledAuditId: string; received: number; awaitingReview: number };
export async function getCoordinatorFindingSummaries(): Promise<CoordinatorFindingSummary[]> {
  const response = await api.get("/audit-findings/coordinator/finding-summaries");
  return unwrap(response);
}

export async function getCoordinatorAuditWorkspace(scheduledAuditId: string): Promise<{
  audit: { _id:string; iqaNumber:string; prakalpa:string; leadAuditor:string; location:string; status:string };
  findings: AuditFinding[];
}> {
  const response = await api.get(`/audit-findings/coordinator/audits/${encodeURIComponent(scheduledAuditId)}/findings`);
  return unwrap(response);
}
export async function reviewCoordinatorFinding(id:string,payload:{findings:string;severity:"non_conformance"|"open_for_improvement"}):Promise<AuditFinding> {
  const response = await api.patch(`/audit-findings/coordinator/findings/${id}/review`,payload);
  return unwrap(response);
}
export async function completeCoordinatorFinding(id:string):Promise<AuditFinding> {
  const response = await api.post(`/audit-findings/coordinator/findings/${id}/complete`);
  return unwrap(response);
}

export async function generateReportFromFinding(
  id: string
): Promise<any> {

  const response =
    await api.post(
      `/audit-findings/${id}/generate-report`
    );

  return unwrap<any>(
    response
  );
}


export interface CoordinatorConsolidatedFinding
  extends ConsolidatedFinding {
  officialReport?: {
    _id: string;
    iqrNumber: string;
    workflowStatus?: string;
    severity?: string;
  } | null;
  audit?: {
    _id: string;
    iqaNumber: string;
    prakalpa: string;
    location: string;
  } | null;
}

export async function getCoordinatorConsolidatedFindings():
  Promise<CoordinatorConsolidatedFinding[]> {
  const response = await api.get(
    "/audit-findings/coordinator/consolidated-findings"
  );

  return unwrap<CoordinatorConsolidatedFinding[]>(response);
}


/**
 * Review NC/OFI classification for a consolidated finding.
 * The backend enforces assigned-Coordinator authorization.
 */
/**
 * Generate the official IQR for a submitted consolidated finding.
 * The backend owns numbering, authorization, and idempotency.
 */
export async function generateReportFromConsolidatedFinding(
  findingId: string
): Promise<{
  _id: string;
  iqrNumber: string;
  workflowStatus?: string;
  severity?: string;
}> {
  const response = await api.post(
    `/audit-findings/coordinator/consolidated-findings/${findingId}/generate-report`
  );

  return unwrap(response);
}

export async function editCoordinatorConsolidatedFinding(
  findingId: string,
  updates: {
    title: string;
    description: string;
    supportingNotes: string;
  }
): Promise<CoordinatorConsolidatedFinding> {
  const response = await api.patch(
    `/audit-findings/coordinator/consolidated-findings/${findingId}/details`,
    updates
  );
  return unwrap<CoordinatorConsolidatedFinding>(response);
}

export async function reviewCoordinatorConsolidatedClassification(
  findingId: string,
  classification: "NC" | "OFI"
): Promise<CoordinatorConsolidatedFinding> {
  const response = await api.patch(
    `/audit-findings/coordinator/consolidated-findings/${findingId}/classification`,
    { classification }
  );

  return unwrap<CoordinatorConsolidatedFinding>(response);
}

export async function getAuditorBatchStatus(scheduledAuditId: string): Promise<{submittedAt: string; findingCount: number} | null> {
  const response = await api.get(`/audit-findings/scheduled-audits/${scheduledAuditId}/auditor-batch`);
  return unwrap(response);
}
export async function submitAllAuditorFindings(scheduledAuditId: string): Promise<{submitted: boolean; findingCount: number}> {
  const response = await api.post(`/audit-findings/scheduled-audits/${scheduledAuditId}/auditor-batch/submit`, { confirmed: true });
  return unwrap(response);
}

export interface LeadHandoverRequest {
  requestId: string;
  findingIds: string[];
  confirmation: string;
}

// Same canonical snapshot as the backend; populated sources are reduced to their IDs.
export async function confirmConsolidatedHandover(findings: ConsolidatedFinding[]): Promise<LeadHandoverRequest> {
  const rows = findings.map(f => [String(f._id), f.workflowStatus, f.status, f.classification, undefined,
    0, null, f.updatedAt || null, f.title || "",
    f.sourceFindings.map(source => typeof source === "string" ? source : source._id).sort()
  ]).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  const bytes = new TextEncoder().encode(JSON.stringify(rows));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return { requestId: crypto.randomUUID(), findingIds: findings.map(f => f._id).sort(),
    confirmation: Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("") };
}

export interface LeadBatchStatus {
  submitted: boolean;
  submittedAt: string | null;
  finalized: boolean;
  handoverCount: number;
  findingIds: string[];
  confirmation: string;
  missingAuditors: string[];
  pending: number;
  approved: number;
  discarded: number;
}
export async function getLeadBatchStatus(auditId: string): Promise<LeadBatchStatus> {
  const response = await api.get(`/audit-findings/scheduled-audits/${auditId}/lead-batch`);
  return unwrap<LeadBatchStatus>(response);
}
export async function submitLeadBatch(auditId: string, request: LeadHandoverRequest): Promise<{ approved: number; discarded: number }> {
  const response = await api.post(`/audit-findings/scheduled-audits/${auditId}/lead-batch/submit`, request);
  return unwrap<{ approved: number; discarded: number }>(response);
}

export async function discardCoordinatorFinding(id:string):Promise<AuditFinding> {
 const response=await api.post(`/audit-findings/coordinator/findings/${id}/discard`);
 return unwrap(response);
}
export async function generateCoordinatorBatchReports(id:string):Promise<{closed:boolean;generated:number;discarded:number;alreadyClosed:boolean}> {
 const response=await api.post(`/audit-findings/coordinator/audits/${encodeURIComponent(id)}/generate-reports`);
 return unwrap(response);
}
