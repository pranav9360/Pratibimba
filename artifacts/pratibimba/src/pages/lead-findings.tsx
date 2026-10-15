import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  approveAuditFinding,
  getLeadBatchStatus,
  submitLeadBatch,
  confirmConsolidatedHandover,
  type LeadHandoverRequest,
  type LeadBatchStatus,
  saveLeadFindingCopy,
  createConsolidatedFinding,
  getAuditFindings,
  getEligibleSubmittedFindingsForAudit,
  getConsolidatedFindingsForAudit,
  returnAuditFindingToAuditor,
  submitAllConsolidatedFindingsForAudit,
  updateConsolidatedFinding,
  type AuditFinding,
  type ConsolidatedFinding,
  type ConsolidatedFindingPayload,
} from "../services/auditFindingService";
import FindingEvidence from "../components/finding-evidence";
import { getScheduledAuditById } from "../services/scheduledAuditService";
import type { ScheduledAudit } from "../context/app-context";


function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

function formatScheduledAuditDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}


function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}


function statusLabel(status?: string) {
  switch (status) {
    case "submitted_to_lead":
      return "Awaiting Review";

    case "returned_to_auditor":
      return "Returned to Auditor";

    case "approved_by_lead":
      return "Approved";

    case "submitted_to_coordinator":
      return "Sent to Coordinator";

    case "converted_to_report":
      return "IQR Generated";

    default:
      return status
        ? status.replaceAll("_", " ")
        : "Unknown";
  }
}


function severityLabel(severity?: string) {
  if (
    severity === "non_conformance"
  ) {
    return "Non-Conformance";
  }

  if (
    severity === "open_for_improvement"
  ) {
    return "Open for Improvement";
  }

  return severity || "—";
}


function submitterName(
  finding: AuditFinding
) {
  const submittedBy =
    finding.submittedBy as any;

  if (
    submittedBy &&
    typeof submittedBy === "object"
  ) {
    return (
      submittedBy.name ||
      submittedBy.email ||
      "Auditor"
    );
  }

  return "Auditor";
}


interface ScheduledAuditSummary {
  _id: string;
  workflowMode?: string;
  iqaNumber: string;
  prakalpa: string;
  location: string;
  sublocation: string;
  startDate: string;
  endDate: string;
  auditCoordinator: string;
}

function requestErrorMessage(error: any) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to load findings for this Scheduled Audit."
  );
}

function getSubmitterName(
  submitter: AuditFinding["submittedBy"] | ConsolidatedFinding["submittedBy"],
  fallback?: string
) {
  if (submitter && typeof submitter === "object") {
    return submitter.name || submitter.email || fallback || "Auditor";
  }

  return fallback || "Auditor";
}

function findingClassification(finding: AuditFinding) {
  if (finding.classification === "NC" || finding.classification === "OFI") {
    return finding.classification;
  }

  if (finding.severity === "non_conformance") return "NC";
  if (finding.severity === "open_for_improvement") return "OFI";
  return "Unclassified";
}

function sourceFindingId(source: AuditFinding | string) {
  return typeof source === "string" ? source : source._id;
}

function sourceFindingDetails(source: AuditFinding | string) {
  return typeof source === "string" ? null : source;
}

function scheduledAuditIdForFinding(finding: AuditFinding) {
  return typeof finding.scheduledAudit === "string"
    ? finding.scheduledAudit
    : finding.scheduledAudit._id;
}

function ConsolidatedFindingsView({
  audit,
}: {
  audit: ScheduledAuditSummary;
}) {
  const [eligibleFindings, setEligibleFindings] =
    useState<AuditFinding[]>([]);
  const [consolidatedFindings, setConsolidatedFindings] =
    useState<ConsolidatedFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [supportingNotes, setSupportingNotes] = useState("");
  const [classification, setClassification] = useState<"NC" | "OFI" | "">("");
  const [operation, setOperation] = useState<"saving" | "submitting" | null>(
    null
  );

  const loadFindings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [eligible, consolidated] = await Promise.all([
        getEligibleSubmittedFindingsForAudit(audit._id),
        getConsolidatedFindingsForAudit(audit._id),
      ]);

      if (!Array.isArray(eligible) || !Array.isArray(consolidated)) {
        throw new Error("The findings response was not a list.");
      }

      setEligibleFindings(eligible);
      setConsolidatedFindings(consolidated);
    } catch (requestError: any) {
      console.error(
        "Failed to load consolidated review findings:",
        requestError
      );
      setError(requestErrorMessage(requestError));
      setEligibleFindings([]);
      setConsolidatedFindings([]);
    } finally {
      setLoading(false);
    }
  }, [audit._id]);

  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);

  const resetForm = () => {
    setEditingFindingId(null);
    setTitle("");
    setDescription("");
    setSupportingNotes("");
    setClassification("");
    setSelectedSourceIds([]);
    setOperationError("");
    setSuccessMessage("");
  };

  const beginEditing = (finding: ConsolidatedFinding) => {
    setEditingFindingId(finding._id);
    setTitle(finding.title);
    setDescription(finding.description || "");
    setSupportingNotes(finding.supportingNotes || "");
    setClassification(
      finding.classification === "NC" || finding.classification === "OFI"
        ? finding.classification
        : ""
    );
    setSelectedSourceIds(finding.sourceFindings.map(sourceFindingId));
    setOperationError("");
    setSuccessMessage("");
  };

  const toggleSource = (findingId: string) => {
    setSelectedSourceIds((current) =>
      current.includes(findingId)
        ? current.filter((id) => id !== findingId)
        : [...current, findingId]
    );
    setOperationError("");
    setSuccessMessage("");
  };

  const sourceOptions = useMemo(() => {
    const byId = new Map<string, AuditFinding>();

    for (const finding of eligibleFindings) {
      byId.set(finding._id, finding);
    }

    if (editingFindingId) {
      const editingFinding = consolidatedFindings.find(
        (finding) => finding._id === editingFindingId
      );

      editingFinding?.sourceFindings.forEach((source) => {
        if (typeof source !== "string") {
          byId.set(source._id, source);
        }
      });
    }

    return [...byId.values()];
  }, [consolidatedFindings, editingFindingId, eligibleFindings]);

  const validateForm = () => {
    if (!title.trim()) {
      setOperationError("Enter a title for the consolidated finding.");
      return false;
    }

    if (selectedSourceIds.length === 0) {
      setOperationError("Select at least one source finding.");
      return false;
    }

    return true;
  };

  const saveDraft = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOperationError("");
    setSuccessMessage("");

    if (operation || !validateForm()) return;

    if (classification !== "NC" && classification !== "OFI") {
      setOperationError("Select NC or OFI classification.");
      return;
    }

    const previousSourceIds =
      consolidatedFindings
        .find((finding) => finding._id === editingFindingId)
        ?.sourceFindings.map(sourceFindingId)
        .sort() || [];
    const nextSourceIds = [...selectedSourceIds].sort();
    const sourceSelectionChanged =
      previousSourceIds.length !== nextSourceIds.length ||
      previousSourceIds.some((id, index) => id !== nextSourceIds[index]);

    if (
      selectedSourceIds.length > 1 &&
      (!editingFindingId || sourceSelectionChanged) &&
      !window.confirm(
        `You selected ${selectedSourceIds.length} original findings. Confirm that these are duplicates or related observations suitable for consolidation.`
      )
    ) {
      return;
    }

    const payload: ConsolidatedFindingPayload = {
      title: title.trim(),
      description: description.trim(),
      supportingNotes: supportingNotes.trim(),
      classification,
      sourceFindings: selectedSourceIds,
    };

    setOperation("saving");

    try {
      if (editingFindingId) {
        await updateConsolidatedFinding(editingFindingId, payload);
      } else {
        await createConsolidatedFinding(audit._id, payload);
      }

      resetForm();
      await loadFindings();
      setSuccessMessage(
        editingFindingId
          ? "Consolidated draft updated."
          : "Consolidated draft created."
      );
    } catch (requestError: any) {
      console.error("Failed to save consolidated finding:", requestError);
      setOperationError(requestErrorMessage(requestError));
    } finally {
      setOperation(null);
    }
  };

  const submitAllDrafts = async () => {
    setOperationError("");
    setSuccessMessage("");

    if (operation || loading) return;

    const drafts = consolidatedFindings.filter(
      (finding) =>
        finding.status === "DRAFT" &&
        finding.workflowStatus === "consolidated_draft"
    );

    if (drafts.length === 0) {
      setOperationError("There are no consolidated drafts to submit.");
      return;
    }

    if (eligibleFindings.length > 0) {
      setOperationError(
        "Consolidate all currently submitted Auditor findings before sending."
      );
      return;
    }

    const request = await confirmConsolidatedHandover(drafts);
    if (!window.confirm(
      `Approve and send all ${drafts.length} consolidated findings for ${audit.iqaNumber} to the Audit Coordinator? This cannot be undone.`
    )) return;

    setOperation("submitting");

    try {
      await submitAllConsolidatedFindingsForAudit(audit._id, request);
      resetForm();
      await loadFindings();
      setSuccessMessage(
        "The confirmed consolidated findings were submitted. Earlier handovers remain unchanged."
      );
    } catch (requestError: any) {
      console.error("Failed to submit IQA findings:", requestError);
      setOperationError(requestErrorMessage(requestError));
    } finally {
      setOperation(null);
    }
  };

  const showDraftForm =
    Boolean(editingFindingId) || eligibleFindings.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="font-label-sm text-primary font-bold uppercase tracking-wide">
            Consolidated workflow
          </p>
          <h2 className="font-headline-md text-on-surface mt-1">
            Review Findings
          </h2>
          <p className="font-body-md text-on-surface-variant mt-1">
            {audit.iqaNumber} · {audit.prakalpa} · {audit.location}
            {audit.sublocation ? ` · ${audit.sublocation}` : ""}
          </p>
          <p className="font-body-sm text-on-surface-variant mt-1">
            {formatScheduledAuditDate(audit.startDate)} –{" "}
            {formatScheduledAuditDate(audit.endDate)}
            {audit.auditCoordinator
              ? ` · Coordinator: ${audit.auditCoordinator}`
              : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadFindings()}
          disabled={loading || Boolean(operation)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors font-label-md font-medium disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[19px]">
            refresh
          </span>
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 flex gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-error">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-600/30 bg-green-600/5 px-4 py-3">
          <p className="font-body-md text-green-700">{successMessage}</p>
        </div>
      )}

      {operationError && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 flex gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-error">{operationError}</p>
        </div>
      )}

      {loading ? (
        <div className="min-h-[35vh] flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-[42px] text-primary animate-spin">
              progress_activity
            </span>
            <p className="font-body-md text-on-surface-variant mt-3">
              Loading findings for this Scheduled Audit...
            </p>
          </div>
        </div>
      ) : !error ? (
        <>
          <section className="space-y-3">
            <div>
              <h3 className="font-headline-sm text-on-surface">
                Submitted Auditor Findings
              </h3>
              <p className="font-body-sm text-on-surface-variant mt-1">
                Select findings to explicitly group related observations. Original Auditor findings are never changed.
              </p>
            </div>

            {sourceOptions.length === 0 ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-8 text-center">
                <p className="font-body-md text-on-surface-variant">
                  No ungrouped submitted findings are currently available.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {sourceOptions.map((finding) => {
                  const selected = selectedSourceIds.includes(finding._id);

                  return (
                  <label
                    key={finding._id}
                    className={`block rounded-xl border p-5 space-y-3 cursor-pointer ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-outline-variant bg-surface-container-low"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={Boolean(operation)}
                        onChange={() => toggleSource(finding._id)}
                        className="mt-1 h-4 w-4 accent-primary"
                        aria-label={`Select finding ${finding.auditArea || finding._id}`}
                      />
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h4 className="font-headline-sm text-on-surface">
                            {finding.auditArea || "Audit finding"}
                          </h4>
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm font-bold">
                            {findingClassification(finding)}
                          </span>
                        </div>
                        <p className="font-body-md text-on-surface whitespace-pre-wrap">
                          {finding.findings || finding.description || "—"}
                        </p>
                        <p className="font-body-sm text-on-surface-variant">
                          Submitted by{" "}
                          {getSubmitterName(
                            finding.submittedBy,
                            finding.submittedByName
                          )}
                          {" · "}
                          {finding.status ? `${finding.status} · ` : ""}
                          {statusLabel(finding.workflowStatus)}
                        </p>
                        {finding.proofFiles?.length ? (
                          <div>
                            <p className="font-label-sm text-on-surface-variant mb-1">
                              Evidence references
                            </p>
                            <ul className="flex flex-wrap gap-2">
                              {finding.proofFiles.map((file, index) => (
                                <li
                                  key={`${file}-${index}`}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant font-body-sm text-on-surface"
                                >
                                  <span className="material-symbols-outlined text-[16px]">
                                    attach_file
                                  </span>
                                  {file}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {finding.hasChecklist && (
                          <p className="font-body-sm text-on-surface-variant">
                            Checklist attached
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                  );
                })}
              </div>
            )}

            <p className="font-label-md font-semibold text-on-surface">
              {selectedSourceIds.length} source finding
              {selectedSourceIds.length === 1 ? "" : "s"} selected
            </p>

            {showDraftForm && (
              <form
                onSubmit={saveDraft}
                className="rounded-xl border border-outline-variant bg-surface-container-low p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <h4 className="font-headline-sm text-on-surface">
                      {editingFindingId
                        ? "Edit Consolidated Draft"
                        : "Create Consolidated Draft"}
                    </h4>
                    {editingFindingId && (
                      <p className="font-body-sm text-on-surface-variant mt-1">
                        Submitted findings are locked and cannot be edited.
                      </p>
                    )}
                  </div>
                  {editingFindingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      disabled={Boolean(operation)}
                      className="px-3 py-2 rounded-lg border border-outline-variant bg-surface font-label-md"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <label className="block space-y-1.5">
                  <span className="font-label-md font-medium text-on-surface">
                    Title *
                  </span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    required
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body-md"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="font-label-md font-medium text-on-surface">
                    Description / consolidated observation
                  </span>
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body-md"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="font-label-md font-medium text-on-surface">
                    Supporting notes
                  </span>
                  <textarea
                    value={supportingNotes}
                    onChange={(event) => setSupportingNotes(event.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body-md"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="font-label-md font-medium text-on-surface">
                    Classification *
                  </span>
                  <select
                    value={classification}
                    onChange={(event) =>
                      setClassification(
                        event.target.value === "NC"
                          ? "NC"
                          : event.target.value === "OFI"
                            ? "OFI"
                            : ""
                      )
                    }
                    required
                    className="w-full sm:max-w-xs rounded-lg border border-outline-variant bg-surface px-3 py-2.5 font-body-md"
                  >
                    <option value="">Select classification</option>
                    <option value="NC">NC</option>
                    <option value="OFI">OFI</option>
                  </select>
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={Boolean(operation)}
                    className="px-4 py-2.5 rounded-lg bg-primary text-white font-label-md font-semibold disabled:opacity-60"
                  >
                    {operation === "saving"
                      ? "Saving..."
                      : editingFindingId
                        ? "Save Draft"
                        : "Create Draft"}
                  </button>
                </div>
              </form>
            )}
          </section>

          <section className="space-y-3">
            <div>
              <h3 className="font-headline-sm text-on-surface">
                Existing Consolidated Findings
              </h3>
              <p className="font-body-sm text-on-surface-variant mt-1">
                Consolidated records and their preserved source references.
              </p>
            </div>

            {consolidatedFindings.length === 0 ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-8 text-center">
                <p className="font-body-md text-on-surface-variant">
                  No consolidated findings have been created for this audit.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {consolidatedFindings.some(
                  (finding) => finding.workflowStatus === "consolidated_draft"
                ) && (
                  <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-label-lg font-bold text-on-surface">
                        Final IQA Review
                      </p>
                      <p className="font-body-sm text-on-surface-variant mt-1">
                        Review every consolidated finding before forwarding the IQA.
                        All submitted Auditor findings must be included.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void submitAllDrafts()}
                      disabled={Boolean(operation) || loading || eligibleFindings.length > 0}
                      className="px-5 py-3 rounded-lg bg-primary text-white font-label-md font-bold disabled:opacity-50"
                    >
                      {operation === "submitting"
                        ? "Submitting IQA..."
                        : "Approve & Send All to Audit Coordinator"}
                    </button>
                  </div>
                )}
                {consolidatedFindings.map((finding) => (
                  <article
                    key={finding._id}
                    className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden"
                  >
                    <div className="p-5 sm:p-6 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <h4 className="font-headline-sm text-on-surface">
                            {finding.title}
                          </h4>
                          <p className="font-body-sm text-on-surface-variant mt-1 whitespace-pre-wrap">
                            {finding.description || "No consolidated summary provided."}
                          </p>
                          {finding.supportingNotes && (
                            <p className="font-body-sm text-on-surface-variant mt-2 whitespace-pre-wrap">
                              Supporting notes: {finding.supportingNotes}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm font-bold">
                            {finding.classification || "Unclassified"}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm">
                            {finding.status} · {statusLabel(finding.workflowStatus)}
                          </span>
                        </div>
                      </div>

                      <div className="border-t border-outline-variant/30 pt-4">
                        <h5 className="font-label-md font-bold text-on-surface">
                          Source findings ({finding.sourceFindings.length})
                        </h5>
                        {finding.sourceFindings.length === 0 ? (
                          <p className="font-body-sm text-on-surface-variant mt-2">
                            No source references are available.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {finding.sourceFindings.map((source) => {
                              const details =
                                sourceFindingDetails(source);
                              const id = sourceFindingId(source);

                              return (
                                <li
                                  key={id}
                                  className="rounded-lg bg-surface-container-lowest p-3"
                                >
                                  <p className="font-body-sm text-on-surface">
                                    {details
                                      ? details.findings ||
                                        details.description ||
                                        details.auditArea ||
                                        `Finding ${id}`
                                      : `Finding ${id}`}
                                  </p>
                                  {details && (
                                    <p className="font-body-sm text-on-surface-variant mt-1">
                                      {details.auditArea
                                        ? `${details.auditArea} · `
                                        : ""}
                                      {findingClassification(details)} · Submitted by{" "}
                                      {getSubmitterName(
                                        details.submittedBy,
                                        details.submittedByName
                                      )}
                                    </p>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>

                      {finding.status === "DRAFT" &&
                        finding.workflowStatus === "consolidated_draft" && (
                          <div className="flex flex-wrap gap-3 border-t border-outline-variant/30 pt-4">
                            <button
                              type="button"
                              onClick={() => beginEditing(finding)}
                              disabled={Boolean(operation)}
                              className="px-4 py-2 rounded-lg border border-outline-variant bg-surface hover:bg-surface-container font-label-md font-semibold disabled:opacity-60"
                            >
                              Edit Draft
                            </button>

                          </div>
                        )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

        </>
      ) : null}
    </div>
  );
}

export default function LeadFindingsPage() {
  const params = new URLSearchParams(window.location.search);
  const scheduledAuditId = params.get("scheduledAuditId");

  if (!scheduledAuditId) {
    return <LegacyLeadFindingsPage />;
  }

  return (
    <ScopedLeadFindingsPage scheduledAuditId={scheduledAuditId} />
  );
}

function ScopedLeadFindingsPage({
  scheduledAuditId,
}: {
  scheduledAuditId: string;
}) {
  const [audit, setAudit] = useState<ScheduledAudit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadAudit = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await getScheduledAuditById(scheduledAuditId);
        if (active) {
          setAudit(result);
        }
      } catch (requestError: any) {
        console.error("Failed to load Scheduled Audit:", requestError);
        if (active) {
          setAudit(null);
          setError(
            requestError?.response?.data?.message ||
              requestError?.message ||
              "Unable to load this Scheduled Audit."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadAudit();
    return () => {
      active = false;
    };
  }, [scheduledAuditId]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-[42px] text-primary animate-spin">
            progress_activity
          </span>
          <p className="font-body-md text-on-surface-variant mt-3">
            Loading Scheduled Audit...
          </p>
        </div>
      </div>
    );
  }

  if (error || !audit) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 flex gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-error">
            {error || "Scheduled Audit details were unavailable. Review cannot continue."}
          </p>
        </div>
      </div>
    );
  }

  const workflowMode =
    audit.workflowMode === undefined ? "legacy" : audit.workflowMode;

  if (workflowMode !== "legacy" && workflowMode !== "consolidated") {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 flex gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-error">
            This Scheduled Audit has an unknown workflow mode. Review cannot continue safely.
          </p>
        </div>
      </div>
    );
  }

  const auditId = audit._id || audit.id;
  if (!auditId) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 flex gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="font-body-md text-error">
            Scheduled Audit details did not include a valid identifier.
          </p>
        </div>
      </div>
    );
  }

  if (workflowMode === "consolidated") {
    return (
      <ConsolidatedFindingsView
        audit={{
          _id: auditId,
          workflowMode,
          iqaNumber: audit.iqaNumber || "Scheduled Audit",
          prakalpa: audit.prakalpa || "",
          location: audit.location || "",
          sublocation: audit.sublocation || "",
          startDate: audit.startDate || "",
          endDate: audit.endDate || "",
          auditCoordinator: audit.auditCoordinator || "",
        }}
      />
    );
  }

  return (
    <LegacyLeadFindingsPage
      scheduledAuditId={auditId}
    />
  );
}

function LegacyLeadFindingsPage({
  scheduledAuditId,
}: {
  scheduledAuditId?: string;
}) {
  const [
    findings,
    setFindings,
  ] = useState<AuditFinding[]>([]);

  // data-iqa-review-grouping: UI-only grouping for global legacy review.
  const [batchStatus, setBatchStatus] = useState<LeadBatchStatus | null>(null);
  const [batchRequest, setBatchRequest] = useState<LeadHandoverRequest | null>(null);
  const [batchConfirm, setBatchConfirm] = useState(false);
  const [batchAcknowledged, setBatchAcknowledged] = useState(false);
  const [expandedAuditKey, setExpandedAuditKey] = useState<string | null>(null);

  const auditGroups = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      iqaNumber: string;
      prakalpa: string;
      location: string;
      findings: AuditFinding[];
      pendingCount: number;
    }>();

    for (const finding of findings) {
      const auditId = finding.scheduledAudit
        ? scheduledAuditIdForFinding(finding)
        : "";
      const key = auditId || `unlinked:${finding._id}`;

      let group = groups.get(key);
      if (!group) {
        group = {
          key,
          iqaNumber: finding.iqaNumber || "IQA not specified",
          prakalpa: finding.prakalpa || "",
          location: finding.location || "",
          findings: [],
          pendingCount: 0,
        };
        groups.set(key, group);
      }

      group.findings.push(finding);
      if (finding.workflowStatus === "submitted_to_lead") {
        group.pendingCount++;
      }
    }

    return [...groups.values()];
  }, [findings]);

  const visibleFindings = useMemo(() => {
    if (scheduledAuditId) return findings;
    return auditGroups.find(
      (group) => group.key === expandedAuditKey
    )?.findings || [];
  }, [auditGroups, expandedAuditKey, findings, scheduledAuditId]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [editing, setEditing] = useState<AuditFinding | null>(null);
  const [editText, setEditText] = useState("");
  const [editSeverity, setEditSeverity] = useState<"open_for_improvement" | "non_conformance">("open_for_improvement");

  const saveEdit = async () => {
    if (!editing || processing) return;
    setProcessing(true);
    setError("");
    try {
      await saveLeadFindingCopy(editing._id, {
        findings: editText.trim(), severity: editSeverity,
        revision: editing.leadEditedCopy?.revision || 0,
      });
      setEditing(null);
      setSuccess("Lead Auditor review copy saved. Original Auditor finding preserved.");
      await loadFindings();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Unable to save review copy.");
    } finally { setProcessing(false); }
  };

  const [
    selected,
    setSelected,
  ] = useState<AuditFinding | null>(
    null
  );

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    action,
    setAction,
  ] = useState<
    "approve" | "return" | "discard" | null
  >(null);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState("");


  const loadFindings =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const data =
          await getAuditFindings("review");

        if (!Array.isArray(data)) {
          throw new Error("The findings response was not a list.");
        }

        setFindings(
          scheduledAuditId
            ? data.filter(
                (finding) =>
                  scheduledAuditIdForFinding(finding) === scheduledAuditId
              )
            : data
        );
      } catch (err: any) {
        console.error(
          "Failed to load Lead findings:",
          err
        );

        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load findings."
        );
      } finally {
        setLoading(false);
      }
    }, [scheduledAuditId]);


  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);


  const activeAuditId = scheduledAuditId || (expandedAuditKey && !expandedAuditKey.startsWith("unlinked:") ? expandedAuditKey : null);
  useEffect(() => {
    setBatchStatus(null);
    if (!activeAuditId) return;
    let cancelled = false;
    void getLeadBatchStatus(activeAuditId).then(data => { if (!cancelled) setBatchStatus(data); })
      .catch(err => { if (!cancelled) setError(requestErrorMessage(err)); });
    return () => { cancelled = true; };
  }, [activeAuditId, findings]);

  const finalizeBatch = async () => {
    if (!activeAuditId || !batchAcknowledged || !batchRequest || processing) return;
    setProcessing(true); setError("");
    try {
      const result = await submitLeadBatch(activeAuditId, batchRequest);
      setSuccess(`Batch submitted: ${result.approved} approved, ${result.discarded} discarded.`);
      setBatchConfirm(false); setBatchAcknowledged(false);
      await loadFindings();
    } catch (err: any) { setError(requestErrorMessage(err)); }
    finally { setProcessing(false); }
  };

  const pending =
    useMemo(
      () =>
        visibleFindings.filter(
          (finding) =>
            finding.workflowStatus ===
            "submitted_to_lead"
        ),
      [visibleFindings]
    );


  const processed =
    useMemo(
      () =>
        visibleFindings.filter(
          (finding) =>
            finding.workflowStatus !==
            "submitted_to_lead"
        ),
      [visibleFindings]
    );


  const closeDialog = () => {
    if (processing) return;

    setSelected(null);
    setRemarks("");
    setAction(null);
  };


  const beginApprove = (
    finding: AuditFinding
  ) => {
    setSelected(finding);
    setRemarks("");
    setAction("approve");
    setSuccess("");
  };


  const beginReturn = (
    finding: AuditFinding
  ) => {
    setSelected(finding);
    setRemarks("");
    setAction("discard");
    setSuccess("");
  };


  const executeAction =
    async () => {
      if (
        !selected ||
        !action ||
        processing
      ) {
        return;
      }



      setProcessing(true);
      setError("");

      try {
        if (action === "discard") {
          await approveAuditFinding(selected._id, { decision: "discard" });
          setSuccess("Finding discarded; preserved in audit history.");
        } else {
          await approveAuditFinding(
            selected._id,
            remarks.trim()
              ? {
                  remarks:
                    remarks.trim(),
                }
              : {}
          );

          setSuccess(
            "Finding approved. Submit the complete batch when all reviews are finished."
          );
        }

        setSelected(null);
        setRemarks("");
        setAction(null);

        await loadFindings();
      } catch (err: any) {
        console.error(
          "Lead review action failed:",
          err
        );

        setError(
          err?.response?.data?.message ||
          err?.message ||
          "Unable to complete the review action."
        );
      } finally {
        setProcessing(false);
      }
    };


  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="min-h-[55vh] flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-[42px] text-primary animate-spin">
              progress_activity
            </span>

            <p className="font-body-md text-on-surface-variant mt-3">
              Loading findings for review...
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">
            {scheduledAuditId
              ? "Lead Auditor Review · Scheduled Audit"
              : "Lead Auditor Review"}
          </h2>

          <p className="font-body-md text-on-surface-variant mt-1">
            Review findings submitted by Auditors before forwarding them to the Audit Coordinator.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadFindings()
          }
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-outline-variant bg-surface-container hover:bg-surface-container-high transition-colors font-label-md font-medium"
        >
          <span className="material-symbols-outlined text-[19px]">
            refresh
          </span>
          Refresh
        </button>
      </div>


      {error && (
        <div className="rounded-xl border border-error/30 bg-error/5 px-4 py-3 flex gap-3">
          <span className="material-symbols-outlined text-error">
            error
          </span>

          <p className="font-body-md text-error">
            {error}
          </p>
        </div>
      )}


      {success && (
        <div className="rounded-xl border border-secondary/30 bg-secondary/5 px-4 py-3 flex gap-3">
          <span className="material-symbols-outlined text-secondary">
            check_circle
          </span>

          <p className="font-body-md text-on-surface">
            {success}
          </p>
        </div>
      )}


              {!scheduledAuditId && (
          <section className="space-y-3" aria-label="IQA review groups">
            <h3 className="font-headline-sm text-on-surface">
              Findings by IQA
            </h3>

            {auditGroups.length === 0 ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6 font-body-md text-on-surface-variant">
                No findings available for review.
              </div>
            ) : auditGroups.map((group) => {
              const expanded = expandedAuditKey === group.key;

              return (
                <button
                  key={group.key}
                  type="button"
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedAuditKey(expanded ? null : group.key)
                  }
                  className={`w-full text-left rounded-xl border p-4 sm:p-5 flex items-center justify-between gap-4 transition-colors ${
                    expanded
                      ? "border-primary bg-primary/5"
                      : "border-outline-variant bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-headline-sm text-on-surface">
                      {group.iqaNumber}
                    </span>
                    <span className="block font-body-sm text-on-surface-variant mt-1">
                      {[group.prakalpa, group.location]
                        .filter(Boolean).join(" · ") || "Scheduled Audit"}
                    </span>
                    <span className="block font-body-sm text-on-surface-variant mt-1">
                      {group.findings.length} findings · {group.pendingCount} awaiting review · {group.findings.length - group.pendingCount} processed
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-on-surface-variant"
                  >
                    {expanded ? "expand_less" : "expand_more"}
                  </span>
                </button>
              );
            })}
          </section>
        )}

        {(scheduledAuditId || (
          expandedAuditKey !== null &&
          auditGroups.some(group => group.key === expandedAuditKey)
        )) && (
          <>
{activeAuditId && batchStatus && !batchStatus.finalized && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 flex flex-col gap-3">
          <p className="font-label-md">{batchStatus.submitted ? "Supplemental handover" : "Initial handover"} · {batchStatus.approved} approved · {batchStatus.discarded} discarded</p>
          {batchStatus.missingAuditors.length > 0 && <p className="text-on-surface-variant text-sm">Pending Auditors (does not block handover): {batchStatus.missingAuditors.join(", ")}</p>}
          <button type="button" disabled={processing || batchStatus.pending > 0 || (batchStatus.submitted && batchStatus.findingIds.length === 0)}
            onClick={() => { setBatchRequest({ requestId: crypto.randomUUID(), findingIds: [...batchStatus.findingIds], confirmation: batchStatus.confirmation }); setBatchAcknowledged(false); setBatchConfirm(true); }}
            className="self-start rounded-lg bg-primary text-on-primary px-5 py-2.5 font-bold disabled:opacity-40">
            Confirm & Send All to Coordinator
          </button>
        </div>
      )}
      {batchStatus?.submitted && <p className="rounded-lg border p-3 text-sm">{batchStatus.handoverCount} handover(s) sent. Previously forwarded findings remain locked. {batchStatus.finalized ? "The Coordinator has finalized this audit; further submissions are closed." : "Later submissions require separate review and an explicit supplemental handover."}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
          <p className="font-label-md text-on-surface-variant">
            Awaiting Review
          </p>

          <p className="font-headline-md text-primary mt-1">
            {pending.length}
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
          <p className="font-label-md text-on-surface-variant">
            Processed
          </p>

          <p className="font-headline-md text-on-surface mt-1">
            {processed.length}
          </p>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5">
          <p className="font-label-md text-on-surface-variant">
            Total Assigned
          </p>

          <p className="font-headline-md text-on-surface mt-1">
            {visibleFindings.length}
          </p>
        </div>
      </div>


      <section className="space-y-3">
        <div>
          <h3 className="font-headline-sm text-on-surface">
            Awaiting Your Review
          </h3>

          <p className="font-body-sm text-on-surface-variant mt-1">
            Edit the Lead Auditor review copy, then approve and send it to the Audit Coordinator. The original submission is preserved.
          </p>
        </div>


        {pending.length === 0 ? (
          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-10 text-center">
            <span className="material-symbols-outlined text-[42px] text-on-surface-variant/40">
              task_alt
            </span>

            <p className="font-headline-sm text-on-surface mt-3">
              No findings awaiting review
            </p>

            <p className="font-body-md text-on-surface-variant mt-1">
              New Auditor submissions assigned to you will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map(
              (finding) => (
                <article
                  key={finding._id}
                  className="rounded-xl border border-outline-variant bg-surface-container-low overflow-hidden"
                >
                  <div className="p-5 sm:p-6 space-y-5">

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm font-bold">
                            Awaiting Review
                          </span>


                        </div>

                        <h4 className="font-headline-sm text-on-surface mt-3">
                          {finding.prakalpa ||
                            "Audit Finding"}
                        </h4>

                        <p className="font-body-sm text-on-surface-variant mt-1">
                          Submitted by{" "}
                          {submitterName(
                            finding
                          )}
                        </p>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="font-label-sm text-on-surface-variant">
                          Submitted
                        </p>

                        <p className="font-body-sm text-on-surface">
                          {formatDateTime(
                            finding.submittedToLeadAt ||
                            finding.createdAt
                          )}
                        </p>
                      </div>
                    </div>


                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="font-label-sm text-on-surface-variant">
                          IQA Number
                        </p>

                        <p className="font-body-md text-on-surface mt-1">
                          {finding.iqaNumber ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="font-label-sm text-on-surface-variant">
                          Location
                        </p>

                        <p className="font-body-md text-on-surface mt-1">
                          {finding.location ||
                            "—"}
                        </p>
                      </div>

                      <div>
                        <p className="font-label-sm text-on-surface-variant">
                          Visit Date
                        </p>

                        <p className="font-body-md text-on-surface mt-1">
                          {formatDate(
                            finding.visitDate
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-label-sm text-on-surface-variant">
                          Visit Time
                        </p>

                        <p className="font-body-md text-on-surface mt-1">
                          {finding.visitTime ||
                            "—"}
                        </p>
                      </div>
                    </div>


                    <div className="rounded-lg bg-surface-container p-4">
                      <p className="font-label-md text-on-surface-variant mb-2">
                        Auditor Finding
                      </p>

                      <p className="font-body-md text-on-surface whitespace-pre-wrap break-words">
                        {finding.findings ||
                          "—"}
                      </p>
                    </div>


                    {Array.isArray(
                      finding.proofFiles
                    ) &&
                      finding.proofFiles.length >
                        0 && (
                        <div>
                          <p className="font-label-md text-on-surface-variant mb-2">
                            Evidence
                          </p>

                          <div className="flex flex-wrap gap-2">
                            {finding.proofFiles.map(
                              (
                                file,
                                index
                              ) => (
                                <span
                                  key={`${file}-${index}`}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant font-body-sm text-on-surface"
                                >
                                  <span className="material-symbols-outlined text-[17px]">
                                    attach_file
                                  </span>

                                  {String(
                                    file
                                  )}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}


                    <FindingEvidence findingId={finding._id} files={finding.proofFiles} leadFiles={finding.leadEvidenceFiles} reviews={finding.evidenceReviews} stage="lead" canUpload={batchStatus?.finalized === false && finding.workflowStatus === "submitted_to_lead"} onUploaded={loadFindings} />
                    {finding.leadEditedCopy?.findings && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                        <p className="font-label-md mb-2">Lead Auditor Review Copy</p>
                        <p className="whitespace-pre-wrap break-words">{finding.leadEditedCopy.findings}</p>

                      </div>
                    )}
                    <div className="flex justify-start pt-2">
                      <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${((finding.leadEditedCopy?.severity || finding.severity) === "non_conformance") ? "border-orange-300 bg-orange-100 text-orange-900" : "border-blue-300 bg-blue-100 text-blue-900"}`}>
                        {(finding.leadEditedCopy?.severity || finding.severity) === "non_conformance" ? "NC · Non-Conformance" : "OFI · Open for Improvement"}
                      </span>
                    </div>
                    {batchStatus?.finalized === false && finding.workflowStatus === "submitted_to_lead" && (
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-1">
                      <button type="button" onClick={() => {
                        setEditing(finding);
                        setEditText(finding.leadEditedCopy?.findings || finding.findings || "");
                        setEditSeverity(finding.leadEditedCopy?.severity || finding.severity);
                        setError("");
                      }} className="px-5 py-2.5 rounded-lg border border-outline-variant font-label-md font-bold hover:bg-surface-container-high">
                        Edit Finding
                      </button>
                      <button type="button" onClick={() => beginReturn(finding)}
                        className="px-5 py-2.5 rounded-lg border border-error text-error font-label-md font-bold">
                        Discard Finding
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          beginApprove(
                            finding
                          )
                        }
                        className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md font-bold hover:opacity-90 transition-opacity"
                      >
                        Approve Finding
                      </button>
                    </div>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>


      {processed.length > 0 && (
        <section className="space-y-3 pt-2">
          <div>
            <h3 className="font-headline-sm text-on-surface">
              Review History
            </h3>

            <p className="font-body-sm text-on-surface-variant mt-1">
              Findings that have already left your active review queue.
            </p>
          </div>

          <div className="rounded-xl border border-outline-variant overflow-hidden">
            <div className="divide-y divide-outline-variant">
              {processed.map(
                (finding) => (
                  <div
                    key={finding._id}
                    className="p-4 sm:p-5 bg-surface-container-low"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-label-md font-bold text-on-surface">
                            {finding.prakalpa ||
                              "Audit Finding"}
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-sm text-on-surface-variant">
                            {statusLabel(
                              finding.workflowStatus
                            )}
                          </span>
                        </div>

                        <p className="font-body-sm text-on-surface-variant mt-1">
                          {finding.iqaNumber ||
                            "No IQA number"}{" "}

                        </p>

                        {finding.leadReviewRemarks && (
                          <p className="font-body-sm text-on-surface mt-2">
                            <span className="font-medium">
                              Remarks:
                            </span>{" "}
                            {
                              finding.leadReviewRemarks
                            }
                          </p>
                        )}
                        <div className="mt-3 flex justify-start">
                          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${((finding.leadEditedCopy?.severity || finding.severity) === "non_conformance") ? "border-orange-300 bg-orange-100 text-orange-900" : "border-blue-300 bg-blue-100 text-blue-900"}`}>
                        {(finding.leadEditedCopy?.severity || finding.severity) === "non_conformance" ? "NC · Non-Conformance" : "OFI · Open for Improvement"}
                      </span>
                        </div>
                      </div>

                      <div className="text-left md:text-right">
                        <p className="font-label-sm text-on-surface-variant">
                          Last reviewed
                        </p>

                        <p className="font-body-sm text-on-surface">
                          {formatDateTime(
                            finding.leadReviewedAt ||
                            finding.updatedAt
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}


                </>
        )}

{batchConfirm && (
  <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
    <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-2xl bg-surface border border-outline-variant shadow-xl p-6 space-y-4">
      <h3 className="font-headline-sm">Confirm Lead Auditor handover</h3>
      <p>Please review all findings carefully. Once confirmed, submitted findings cannot be edited, recalled or unsent.</p>
      <label className="flex gap-3 items-start text-sm"><input type="checkbox" checked={batchAcknowledged}
        onChange={e => setBatchAcknowledged(e.target.checked)} /> I understand this handover is permanent.</label>
      <div className="flex justify-end gap-3">
        <button type="button" disabled={processing} onClick={() => setBatchConfirm(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
        <button type="button" disabled={!batchAcknowledged || processing} onClick={() => void finalizeBatch()}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg disabled:opacity-40">{processing ? "Submitting..." : "Confirm & Send All"}</button>
      </div>
    </div>
  </div>
)}

{editing && (
  <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4">
    <div className="w-full max-w-xl rounded-2xl bg-surface p-6 space-y-4 border border-outline-variant shadow-xl">
      <h3 className="font-headline-sm">Edit Lead Auditor Review Copy</h3>
      <p className="font-body-sm text-on-surface-variant">The Auditor's original submission will remain unchanged.</p>
      <label className="block font-label-md">Finding</label>
      <textarea rows={7} value={editText} onChange={(e) => setEditText(e.target.value)}
        className="w-full rounded-lg border border-outline-variant bg-surface p-3" />
      <label className="block font-label-md">Classification</label>
      <select value={editSeverity} onChange={(e) => setEditSeverity(e.target.value as typeof editSeverity)}
        className="w-full rounded-lg border border-outline-variant bg-surface p-3">
        <option value="open_for_improvement">OFI</option>
        <option value="non_conformance">NC</option>
      </select>
      <div className="flex justify-end gap-3">
        <button type="button" disabled={processing} onClick={() => setEditing(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
        <button type="button" disabled={processing || !editText.trim()} onClick={() => void saveEdit()}
          className="px-4 py-2 rounded-lg bg-primary text-on-primary disabled:opacity-50">{processing ? "Saving..." : "Save Changes"}</button>
      </div>
    </div>
  </div>
)}

{selected && action && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl border border-outline-variant overflow-hidden">

            <div className="p-5 sm:p-6 border-b border-outline-variant">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-headline-sm text-on-surface">
                    {action === "discard"
                      ? "Discard Finding"
                      : "Approve Finding"}
                  </h3>

                  <p className="font-body-sm text-on-surface-variant mt-1">
                    {action === "discard"
                      ? "Discard this finding permanently from the active review. It remains in audit history."
                      : "Approve this finding for the final batch handover."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={processing}
                  className="w-9 h-9 rounded-full hover:bg-surface-container flex items-center justify-center disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">
                    close
                  </span>
                </button>
              </div>
            </div>


            <div className="p-5 sm:p-6 space-y-4">
              <div className="rounded-lg bg-surface-container p-4">
                <p className="font-label-sm text-on-surface-variant">
                  {selected.leadEditedCopy?.findings
                    ? "Lead Auditor Approved Review Copy"
                    : "Original Auditor Finding (No Review Edit)"}
                </p>

                <p className="font-body-md text-on-surface mt-1 whitespace-pre-wrap">
                  {selected.leadEditedCopy?.findings || selected.findings}
                </p>
              </div>


              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label-md">Classification:</span>
                <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-semibold ${((selected.leadEditedCopy?.severity || selected.severity) === "non_conformance") ? "border-orange-300 bg-orange-100 text-orange-900" : "border-blue-300 bg-blue-100 text-blue-900"}`}>
                        {(selected.leadEditedCopy?.severity || selected.severity) === "non_conformance" ? "NC · Non-Conformance" : "OFI · Open for Improvement"}
                      </span>
              </div>
              <FindingEvidence findingId={selected._id} files={selected.proofFiles} leadFiles={selected.leadEvidenceFiles} reviews={selected.evidenceReviews} />

              {action === "approve" && (
                <div>
                  <label className="font-label-md text-on-surface block mb-2">
                    Lead Auditor Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    rows={5}
                    placeholder="Optional remarks for the Audit Coordinator..."
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-3 font-body-md text-on-surface outline-none focus:border-primary resize-y"
                  />
                </div>
              )}
            </div>


            <div className="p-5 sm:p-6 border-t border-outline-variant flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                type="button"
                onClick={closeDialog}
                disabled={processing}
                className="px-5 py-2.5 rounded-lg border border-outline-variant font-label-md font-medium disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void executeAction()
                }
                disabled={processing}
                className={
                  action === "discard"
                    ? "px-5 py-2.5 rounded-lg bg-error text-on-error font-label-md font-bold disabled:opacity-40"
                    : "px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md font-bold disabled:opacity-40"
                }
              >
                {processing
                  ? "Processing..."
                  : action === "discard"
                    ? "Discard Finding"
                    : "Approve Finding"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
