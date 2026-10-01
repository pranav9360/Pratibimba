import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  approveAuditFinding,
  getAuditFindings,
  returnAuditFindingToAuditor,
  type AuditFinding,
} from "../services/auditFindingService";


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


export default function LeadFindingsPage() {
  const [
    findings,
    setFindings,
  ] = useState<AuditFinding[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

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
    "approve" | "return" | null
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
          await getAuditFindings();

        setFindings(
          Array.isArray(data)
            ? data
            : []
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
    }, []);


  useEffect(() => {
    void loadFindings();
  }, [loadFindings]);


  const pending =
    useMemo(
      () =>
        findings.filter(
          (finding) =>
            finding.workflowStatus ===
            "submitted_to_lead"
        ),
      [findings]
    );


  const processed =
    useMemo(
      () =>
        findings.filter(
          (finding) =>
            finding.workflowStatus !==
            "submitted_to_lead"
        ),
      [findings]
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
    setAction("return");
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

      if (
        action === "return" &&
        !remarks.trim()
      ) {
        setError(
          "Please enter remarks explaining the required correction."
        );
        return;
      }

      setProcessing(true);
      setError("");

      try {
        if (action === "return") {
          await returnAuditFindingToAuditor(
            selected._id,
            {
              remarks:
                remarks.trim(),
            }
          );

          setSuccess(
            "Finding returned to the Auditor for correction."
          );
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
            "Finding approved and submitted to the Audit Coordinator."
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
            Lead Auditor Review
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
            {findings.length}
          </p>
        </div>
      </div>


      <section className="space-y-3">
        <div>
          <h3 className="font-headline-sm text-on-surface">
            Awaiting Your Review
          </h3>

          <p className="font-body-sm text-on-surface-variant mt-1">
            Approve a finding to forward it to the Audit Coordinator, or return it to the Auditor with correction remarks.
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

                          <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm">
                            {severityLabel(
                              finding.severity
                            )}
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


                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          beginReturn(
                            finding
                          )
                        }
                        className="px-5 py-2.5 rounded-lg border border-error/40 text-error font-label-md font-bold hover:bg-error/5 transition-colors"
                      >
                        Return to Auditor
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
                        Approve & Send to Coordinator
                      </button>
                    </div>
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
                          ·{" "}
                          {severityLabel(
                            finding.severity
                          )}
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


      {selected && action && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-surface shadow-xl border border-outline-variant overflow-hidden">

            <div className="p-5 sm:p-6 border-b border-outline-variant">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-headline-sm text-on-surface">
                    {action === "return"
                      ? "Return Finding to Auditor"
                      : "Approve Finding"}
                  </h3>

                  <p className="font-body-sm text-on-surface-variant mt-1">
                    {action === "return"
                      ? "Explain the correction required before the Auditor resubmits this finding."
                      : "Approve this finding and forward it to the assigned Audit Coordinator."}
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
                  Finding
                </p>

                <p className="font-body-md text-on-surface mt-1 whitespace-pre-wrap">
                  {selected.findings}
                </p>
              </div>


              <div>
                <label className="font-label-md text-on-surface block mb-2">
                  {action === "return"
                    ? "Correction Remarks *"
                    : "Lead Auditor Remarks"}
                </label>

                <textarea
                  value={remarks}
                  onChange={(event) =>
                    setRemarks(
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder={
                    action === "return"
                      ? "Describe exactly what the Auditor should correct..."
                      : "Optional remarks for the Audit Coordinator..."
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-3 font-body-md text-on-surface outline-none focus:border-primary resize-y"
                />
              </div>
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
                disabled={
                  processing ||
                  (
                    action ===
                      "return" &&
                    !remarks.trim()
                  )
                }
                className={
                  action === "return"
                    ? "px-5 py-2.5 rounded-lg bg-error text-on-error font-label-md font-bold disabled:opacity-40"
                    : "px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-md font-bold disabled:opacity-40"
                }
              >
                {processing
                  ? "Processing..."
                  : action === "return"
                    ? "Return to Auditor"
                    : "Approve & Send"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
