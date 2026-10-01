import api from "./api";


export interface AuditFinding {
  _id: string;
  id?: string;

  scheduledAudit: string;
  auditPlan?: string;

  iqaNumber?: string;
  prakalpa?: string;
  location?: string;
  sublocation?: string;

  auditArea?: string;
  severity:
    | "open_for_improvement"
    | "non_conformance";

  findings: string;

  proofFiles?: string[];
  hasChecklist?: boolean;

  visitDate?: string;
  visitTime?: string;

  submittedBy?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };

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

  submittedToLeadAt?: string;
  returnedToAuditorAt?: string;
  resubmittedToLeadAt?: string;
  approvedByLeadAt?: string;
  leadReviewedAt?: string;
  submittedToCoordinatorAt?: string;

  createdAt?: string;
  updatedAt?: string;
}


function unwrap<T>(response: any): T {
  /*
   * Backend ApiResponse stores the actual result in `data`.
   *
   * Keeping unwrapping here prevents individual pages from
   * depending on the backend response envelope.
   */
  return response.data?.data ?? response.data;
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
export async function getAuditFindings():
  Promise<AuditFinding[]> {

  const response =
    await api.get(
      "/audit-findings"
    );

  return unwrap<AuditFinding[]>(
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
