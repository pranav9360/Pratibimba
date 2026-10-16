type ActionEvidenceRecord = { actionProofFiles?: string[]; withdrawnActionProofFiles?: {token: string; status: string}[]; actionSubmittedAt?: string | Date; workflowHistory?: {action: string; actionProofFilesSnapshot?: string[]}[] };
export function actionEvidenceStatus(report: ActionEvidenceRecord, token: string): string;
export function activeActionProofFiles(report: ActionEvidenceRecord): string[];
export function submittedActionEvidence(report: ActionEvidenceRecord, token: string): boolean;
export function findingEvidenceStatus(finding: {proofFiles?: string[]; leadEvidenceFiles?: string[]; evidenceReviews?: {token: string; leadDropped?: boolean; coordinatorDropped?: boolean}[]}, token: string): string;
