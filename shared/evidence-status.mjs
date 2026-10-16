export function findingEvidenceStatus(finding, token) {
  if (![...(finding.proofFiles || []), ...(finding.leadEvidenceFiles || [])].includes(token)) return "removed";
  const review = (finding.evidenceReviews || []).find(r => r.token === token);
  return review?.leadDropped || review?.coordinatorDropped ? "excluded" : "active";
}
export function actionEvidenceStatus(report, token) {
  return (report.withdrawnActionProofFiles || []).find(r => r.token === token)?.status || "active";
}
export const activeActionProofFiles = report => (report.actionProofFiles || []).filter(token => actionEvidenceStatus(report, token) === "active");
export const submittedActionEvidence = (report, token) => {
  const submissions = (report.workflowHistory || []).filter(h => h.action === "action_submitted" && Array.isArray(h.actionProofFilesSnapshot));
  return submissions.some(h => h.actionProofFilesSnapshot.includes(token)) || (!submissions.length && Boolean(report.actionSubmittedAt));
};
