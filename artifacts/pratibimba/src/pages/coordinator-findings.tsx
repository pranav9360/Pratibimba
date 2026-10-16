import { AlertDialog, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "../components/ui/alert-dialog";
import {
  useRef,
  useCallback,
  useEffect,
  useState,
} from "react";

import FindingEvidence from "../components/finding-evidence";
import {
  AuditFinding,
  getCoordinatorAuditWorkspace,
  reviewCoordinatorFinding,
  completeCoordinatorFinding,
  discardCoordinatorFinding,
  generateCoordinatorBatchReports,
  generateReportFromFinding,
  generateReportFromConsolidatedFinding,
  editCoordinatorConsolidatedFinding,
  getAuditFindings,
  getCoordinatorConsolidatedFindings,
  reviewCoordinatorConsolidatedClassification,
  type CoordinatorConsolidatedFinding,
} from "../services/auditFindingService";


function formatDate(
  value?: string
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}


function severityLabel(
  severity?: string
) {
  if (
    severity ===
    "non_conformance"
  ) {
    return "Non-Conformance";
  }

  if (
    severity ===
    "open_for_improvement"
  ) {
    return "Open for Improvement";
  }

  return severity || "—";
}


function getErrorMessage(
  error: any
) {
  return (
    error?.response?.data?.message ||
    error?.message ||
    "An unexpected error occurred."
  );
}


export default function CoordinatorFindingsPage() {
  const [
    findings,
    setFindings,
  ] = useState<AuditFinding[]>([]);

  const selectedAuditId = new URLSearchParams(window.location.search).get("scheduledAuditId");
  const [auditHeader,setAuditHeader] = useState<{iqaNumber:string;prakalpa:string;leadAuditor:string;location:string;status:string}|null>(null);
  const [expandedFinding,setExpandedFinding] = useState<string|null>(null);
  const [coordinatorDrafts,setCoordinatorDrafts] = useState<Record<string,{findings:string;severity:"non_conformance"|"open_for_improvement"}>>({});
  const [workingFinding,setWorkingFinding] = useState<string|null>(null);
  const [discardTargetId, setDiscardTargetId] = useState<string | null>(null);
  const approvalFocus = useRef<HTMLButtonElement | null>(null);
  const [pendingConfirmation,setPendingConfirmation] = useState<{kind:"complete"|"generate"; findingId:string}|null>(null);
  const [confirmationBusy,setConfirmationBusy] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [batchConfirm,setBatchConfirm] = useState(false);
  const [batchAcknowledged,setBatchAcknowledged] = useState(false);
  const [batchMessage, setBatchMessage] = useState("");
  const [consolidated, setConsolidated] =
    useState<CoordinatorConsolidatedFinding[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({
    title: "",
    description: "",
    supportingNotes: "",
  });

  const [classificationSelections, setClassificationSelections] =
    useState<Record<string, "NC" | "OFI">>({});

  const [savingClassificationId, setSavingClassificationId] =
    useState<string | null>(null);

  const [classificationSuccess, setClassificationSuccess] =
    useState<string | null>(null);

  const [generatingConsolidatedId, setGeneratingConsolidatedId] =
    useState<string | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  const [
    generatingId,
    setGeneratingId,
  ] = useState<string | null>(
    null
  );

  const [
    generatedReports,
    setGeneratedReports,
  ] = useState<
    Record<string, any>
  >({});


  const loadFindings =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          if (!selectedAuditId) {
            setFindings([]);
            setConsolidated([]);
            setAuditHeader(null);
            return;
          }
          const workspace = await getCoordinatorAuditWorkspace(selectedAuditId);
          setAuditHeader(workspace.audit);
          const data = workspace.findings;
          const consolidatedData: CoordinatorConsolidatedFinding[] = [];
          setConsolidated(consolidatedData);

          /*
           * Backend jurisdiction is authoritative.
           *
           * This frontend filter is only defensive UI filtering.
           */
          const coordinatorFindings =
            (data || []).filter(
              (finding) =>
                (["submitted_to_coordinator","converted_to_report","discarded_by_coordinator"].includes(finding.workflowStatus))
            );

          setFindings(
            coordinatorFindings
          );
        } catch (err) {
          console.error(
            "Failed to load coordinator findings:",
            err
          );

          setError(
            getErrorMessage(err)
          );
        } finally {
          setLoading(false);
        }
      },
      [selectedAuditId],
    );


  useEffect(() => {
    loadFindings();
  }, [loadFindings]);


  const handleSaveEdit = async (item: CoordinatorConsolidatedFinding) => {
    try {
      setSavingEditId(item._id);
      setError(null);

      const updated = await editCoordinatorConsolidatedFinding(
        item._id,
        editDraft
      );

      setConsolidated((current) =>
        current.map((entry) =>
          entry._id === item._id ? { ...entry, ...updated } : entry
        )
      );

      setClassificationSuccess(null);
      setClassificationSelections((current) => {
        const next = { ...current };
        delete next[item._id];
        return next;
      });
      setEditingId(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingEditId(null);
    }
  };

  const handleSaveClassification = async (
    item: CoordinatorConsolidatedFinding
  ) => {
    const selected =
      classificationSelections[item._id] ??
      item.coordinatorClassification ??
      item.classification;

    if (selected !== "NC" && selected !== "OFI") {
      setError("Please select NC or OFI.");
      return;
    }

    try {
      setSavingClassificationId(item._id);
      setClassificationSuccess(null);
      setError(null);

      const updated =
        await reviewCoordinatorConsolidatedClassification(
          item._id,
          selected
        );

      setConsolidated((current) =>
        current.map((existing) =>
          existing._id === item._id
            ? { ...existing, ...updated }
            : existing
        )
      );

      setClassificationSuccess(item._id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingClassificationId(null);
    }
  };

  const handleGenerateConsolidated = async (
    item: CoordinatorConsolidatedFinding
  ) => {
    if (
      item.workflowStatus !== "submitted_to_coordinator" ||
      item.officialReport
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Generate an official IQR for "${item.title}"?\n\n` +
      "The backend will assign the official IQR number."
    );

    if (!confirmed) return;

    try {
      setGeneratingConsolidatedId(item._id);
      setError(null);

      const report = await generateReportFromConsolidatedFinding(item._id);

      setConsolidated((current) =>
        current.map((existing) =>
          existing._id === item._id
            ? {
                ...existing,
                workflowStatus: "converted_to_report",
                report: report._id,
                officialReport: report,
              }
            : existing
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGeneratingConsolidatedId(null);
    }
  };

  const handleGenerate =
    async (
      finding: AuditFinding
    ) => {
      try {
        setGeneratingId(
          finding._id
        );

        setError(null);

        const report =
          await generateReportFromFinding(
            finding._id
          );

        setGeneratedReports(
          (current) => ({
            ...current,
            [finding._id]:
              report,
          })
        );

        /*
         * The finding leaves the coordinator inbox after the
         * backend transitions it to converted_to_report.
         *
         * Keep it visible temporarily so the coordinator can see
         * the generated IQR number.
         */
      } catch (err) {
        console.error(
          "Failed to generate official IQR:",
          err
        );

        const message =
          getErrorMessage(err);

        setError(message);

        window.alert(
          `Failed to generate official IQR.\n\n${message}`
        );
      } finally {
        setGeneratingId(null);
      }
    };


  const reportEligible = findings.filter(f => f.workflowStatus === "submitted_to_coordinator" && !generatedReports[f._id]);
  const allReady = reportEligible.every(f => Boolean(f.coordinatorCompletedAt));
  const generatedCount = findings.filter(f => f.workflowStatus === "converted_to_report" || Boolean(generatedReports[f._id])).length;

  const generateAllReports = async () => {
    if (batchGenerating || !selectedAuditId || auditHeader?.status !== "completed" || reportEligible.length === 0 || !allReady || !batchAcknowledged) return;
    setBatchGenerating(true);setError(null);setBatchMessage("");
    try {
      const result=await generateCoordinatorBatchReports(selectedAuditId);
      setBatchMessage(result.alreadyClosed ? "This IQA was already finalized." : `${result.generated} official IQR(s) generated. ${result.discarded} discarded. The IQA is now finalized.`);
      setBatchConfirm(false);setBatchAcknowledged(false);
      await loadFindings();
    } catch(err) { setError(getErrorMessage(err)); }
    finally {setBatchGenerating(false);}
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary">
              progress_activity
            </span>

            <p className="mt-3 font-body-md text-on-surface-variant">
              Loading findings awaiting coordinator action...
            </p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1400px]">

        {discardTargetId && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="coordinator-discard-title"
              aria-describedby="coordinator-discard-description"
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-outline-variant bg-surface shadow-2xl"
            >
              <div className="border-b border-outline-variant p-5 sm:p-6">
                <h2 id="coordinator-discard-title" className="font-headline-sm text-on-surface">
                  Discard Finding
                </h2>
                <p id="coordinator-discard-description" className="mt-2 font-body-sm text-on-surface-variant">
                  Discard this finding from the active review? It will be excluded from reports
                  and preserved in audit history.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="rounded-lg bg-surface-container p-4">
                  <p className="mb-2 font-label-sm text-on-surface-variant">Finding</p>
                  <p className="whitespace-pre-wrap font-body-md text-on-surface">
                    {(() => {
                      const finding = findings.find(item => item._id === discardTargetId);
                      return finding
                        ? coordinatorDrafts[finding._id]?.findings ??
                          finding.coordinatorEditedCopy?.findings ??
                          finding.leadEditedCopy?.findings ??
                          finding.findings
                        : "Finding details unavailable.";
                    })()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-outline-variant p-5 sm:flex-row sm:justify-end sm:p-6">
                <button
                  type="button"
                  disabled={workingFinding !== null}
                  onClick={() => setDiscardTargetId(null)}
                  className="rounded-lg border border-outline-variant px-5 py-2.5 font-label-md disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={workingFinding !== null}
                  onClick={async () => {
                    if (!discardTargetId || workingFinding !== null) return;
                    const findingId = discardTargetId;
                    try {
                      setWorkingFinding(findingId);
                      setError(null);
                      const result = await discardCoordinatorFinding(findingId);
                      setFindings(items =>
                        items.map(item => item._id === result._id ? result : item)
                      );
                      setDiscardTargetId(null);
                    } catch (error) {
                      setError(getErrorMessage(error));
                    } finally {
                      setWorkingFinding(null);
                    }
                  }}
                  className="rounded-lg bg-red-600 px-5 py-2.5 font-label-md font-medium text-white disabled:opacity-50"
                >
                  {workingFinding === discardTargetId ? "Discarding..." : "Discard Finding"}
                </button>
              </div>
            </div>
          </div>
        )}


        <div className="mb-8">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <span className="material-symbols-outlined text-[28px] text-primary">
                fact_check
              </span>
            </div>

            <div>
              <h1 className="font-headline-md text-on-surface">
                Review Audit Findings
              </h1>

              <p className="mt-1 font-body-md text-on-surface-variant">
                Review and approve each finding, then generate the official reports below.
              </p>
            </div>
          </div>
        </div>


        <button type="button" className="mb-5 rounded-lg border border-outline-variant px-4 py-2 text-sm" onClick={() => window.location.assign("/scheduled-audits")}>← Back to Scheduled Audits</button>
        {auditHeader && <div className="mb-5 rounded-xl border border-outline-variant/30 bg-surface p-5"><p className="font-title-lg">{auditHeader.iqaNumber} · {auditHeader.prakalpa}</p><p className="text-sm text-on-surface-variant">{findings.length} {findings.length === 1 ? "finding" : "findings"} · {generatedCount} report(s) generated</p><p className="mt-2 text-sm font-semibold text-primary">{auditHeader.status === "completed" ? "IQA Completed · Final review enabled" : "Findings received · Verify and approve before IQA completion"}</p></div>}
        {!selectedAuditId && <p className="mb-5 rounded-lg border border-amber-300 p-4">Open an IQA from Scheduled Audits using Check Findings or Generate IQRs.</p>}
        {pendingConfirmation && (() => {
          const target = findings.find(f => f._id === pendingConfirmation.findingId);
          if (!target) return null;
          const completing = pendingConfirmation.kind === "complete";
          return <AlertDialog open onOpenChange={open=>{if(!open&&!confirmationBusy)setPendingConfirmation(null)}}>
            <AlertDialogContent onCloseAutoFocus={e=>{e.preventDefault();approvalFocus.current?.focus()}} onEscapeKeyDown={e=>{if(confirmationBusy)e.preventDefault()}} overlayClassName="z-[100]" className="z-[101] flex max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl flex-col overflow-y-auto overscroll-contain rounded-2xl bg-surface p-4 sm:p-6">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><span className="material-symbols-outlined">{completing?"lock":"description"}</span></div>
              <AlertDialogTitle id="coordinator-confirm-title" className="font-title-lg text-on-surface">{completing?"Approve and lock this finding?":"Generate official IQR?"}</AlertDialogTitle>
              <AlertDialogDescription id="coordinator-confirm-description" className="mt-2 text-sm text-on-surface-variant">{completing?"This locks the verified finding and its evidence decisions against further changes.":"The backend will create a unique official IQR from the finalized finding."}</AlertDialogDescription>
              <div className="mt-3 rounded-lg bg-surface-container-low p-3 text-sm text-on-surface"><p className="mb-2 font-semibold">Final classification: {(target.coordinatorEditedCopy?.severity ?? target.leadEditedCopy?.severity ?? target.severity) === "non_conformance" ? "NC" : (target.coordinatorEditedCopy?.severity ?? target.leadEditedCopy?.severity ?? target.severity) === "open_for_improvement" ? "OFI" : "Unclassified"}</p><p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{target.coordinatorEditedCopy?.findings || target.leadEditedCopy?.findings || target.findings}</p></div>
              <FindingEvidence findingId={target._id} files={target.proofFiles} leadFiles={target.leadEvidenceFiles} reviews={target.evidenceReviews} />
              <div className="sticky bottom-0 mt-5 flex flex-wrap justify-end gap-2 bg-surface py-2"><AlertDialogCancel disabled={confirmationBusy}>Cancel</AlertDialogCancel><button type="button" disabled={confirmationBusy} className="rounded-lg bg-primary px-4 py-2 text-sm text-on-primary disabled:opacity-50" onClick={async()=>{try{setConfirmationBusy(true);if(completing){setWorkingFinding(target._id);setError(null);const updated=await completeCoordinatorFinding(target._id);setFindings(items=>items.map(x=>x._id===updated._id?updated:x));}else{await handleGenerate(target);}setPendingConfirmation(null);}catch(e){setError(getErrorMessage(e));}finally{setWorkingFinding(null);setConfirmationBusy(false);}}}>{confirmationBusy?"Working...":completing?"Approve & Lock":"Generate IQR"}</button></div>
            </AlertDialogContent>
          </AlertDialog>;
        })()}
        {error && (
          <div className="mb-6 rounded-xl border border-error/30 bg-error/5 p-4">
            <div className="flex gap-3">
              <span className="material-symbols-outlined text-error">
                error
              </span>

              <div>
                <p className="font-label-lg text-error">
                  Unable to complete request
                </p>

                <p className="mt-1 font-body-sm text-on-surface-variant">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}


        <div className="mb-6 rounded-xl border border-outline-variant/30 bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-label-lg text-on-surface">
                Findings for Coordinator Review
              </p>

              <p className="font-body-sm text-on-surface-variant">
                Review each finding, its classification and evidence. Complete all findings before generating reports.
              </p>
            </div>

            <div className="rounded-full bg-primary/10 px-4 py-2 font-label-md text-primary">
              {findings.length}{" "}
              {findings.length === 1
                ? "Finding"
                : "Findings"}
            </div>
          </div>
        </div>


        {findings.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface p-10 text-center">
            <span className="material-symbols-outlined text-[52px] text-on-surface-variant/30">
              task_alt
            </span>

            <h2 className="mt-4 font-headline-sm text-on-surface">
              No findings awaiting IQR generation
            </h2>

            <p className="mx-auto mt-2 max-w-xl font-body-md text-on-surface-variant">
              Findings approved by the Lead Auditor will appear here when they are assigned to you.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {findings.map(
              (finding) => {
                const report =
                  generatedReports[
                    finding._id
                  ];

                const generating =
                  generatingId ===
                  finding._id;

                return (
                  <div
                    key={finding._id}
                    className="overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface"
                  >
                    <button type="button" className="w-full border-b border-outline-variant/20 p-5 text-left hover:bg-surface-container-low" onClick={() => setExpandedFinding(expandedFinding === finding._id ? null : finding._id)}>
                      <span className="font-label-lg">{finding.auditArea || "Finding"} · {severityLabel(finding.coordinatorEditedCopy?.severity || finding.leadEditedCopy?.severity || finding.severity)}</span>
                      <span className={`float-right rounded-full px-3 py-1 text-xs font-semibold ${
                        finding.workflowStatus === "discarded_by_coordinator"
                          ? "bg-red-100 text-red-800"
                          : finding.workflowStatus === "converted_to_report" || report || finding.coordinatorCompletedAt
                            ? "bg-green-100 text-green-800"
                            : "bg-amber-100 text-amber-900"
                      }`}>{finding.workflowStatus === "discarded_by_coordinator" ? "Discarded · History Retained" : finding.workflowStatus === "converted_to_report" || report ? "Report Generated" : finding.coordinatorCompletedAt ? "Approved" : finding.coordinatorVerifiedAt ? "Verified · Awaiting Approval" : "Needs Review"} {expandedFinding === finding._id ? "▴" : "▾"}</span>
                    </button>
                    {expandedFinding === finding._id && <>
                    <div className="border-b border-outline-variant/20 p-5 sm:p-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-primary/10 px-3 py-1 font-label-sm text-primary">
                              {finding.iqaNumber ||
                                "IQA"}
                            </span>

                            <span className="rounded-full bg-secondary-container px-3 py-1 font-label-sm text-on-secondary-container">
                              {severityLabel(
                                finding.leadEditedCopy?.severity || finding.severity
                              )}
                            </span>

                            <span className="rounded-full bg-tertiary-container px-3 py-1 font-label-sm text-on-tertiary-container">
                              Lead Approved
                            </span>
                          </div>

                          <h2 className="font-title-lg text-on-surface">
                            {finding.prakalpa ||
                              "Audit Finding"}
                          </h2>

                          {(finding.location ||
                            finding.sublocation) && (
                            <p className="mt-1 font-body-sm text-on-surface-variant">
                              {[
                                finding.location,
                                finding.sublocation,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </p>
                          )}
                        </div>

                        <div className="text-left lg:text-right">
                          <p className="font-label-sm text-on-surface-variant">
                            Submitted to Coordinator
                          </p>

                          <p className="mt-1 font-body-md text-on-surface">
                            {formatDate(
                              finding.submittedToCoordinatorAt
                            )}
                          </p>
                        </div>
                      </div>
                    </div>


                    <div className="p-5 sm:p-6">
                      <div className="grid gap-5 md:grid-cols-2">

                        <div>
                          <p className="font-label-md text-on-surface-variant">
                            Finding
                          </p>

                          <p className="mt-2 whitespace-pre-wrap font-body-md text-on-surface">
                            {finding.coordinatorEditedCopy?.findings || finding.leadEditedCopy?.findings || finding.findings ||
                              "—"}
                          </p>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <p className="font-label-md text-on-surface-variant">
                              Audit Area
                            </p>

                            <p className="mt-1 font-body-md text-on-surface">
                              {finding.auditArea ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="font-label-md text-on-surface-variant">
                              Submitted By
                            </p>

                            <p className="mt-1 font-body-md text-on-surface">
                              {finding.submittedBy
                                ?.name ||
                                finding.submittedBy
                                  ?.email ||
                                "—"}
                            </p>
                          </div>

                          <div>
                            <p className="font-label-md text-on-surface-variant">
                              Lead Auditor Remarks
                            </p>

                            <p className="mt-1 whitespace-pre-wrap font-body-md text-on-surface">
                              {finding.leadReviewRemarks ||
                                finding.leadRemarks ||
                                "No remarks provided"}
                            </p>
                          </div>
                        </div>
                      </div>


                      {!finding.coordinatorCompletedAt && finding.workflowStatus === "submitted_to_coordinator" && (
                        <div className="my-5 rounded-xl border border-outline-variant/30 p-4 space-y-3">
                          <p className="font-label-lg">Review or Update Finding</p>
                          <textarea rows={4} className="w-full rounded-lg border border-outline-variant bg-surface p-3" aria-label="Final finding text"
                            value={coordinatorDrafts[finding._id]?.findings ?? finding.coordinatorEditedCopy?.findings ?? finding.leadEditedCopy?.findings ?? finding.findings}
                            onChange={e=>setCoordinatorDrafts(d=>({...d,[finding._id]:{findings:e.target.value,severity:d[finding._id]?.severity ?? finding.coordinatorEditedCopy?.severity ?? finding.leadEditedCopy?.severity ?? finding.severity}}))}/>
                          <select aria-label="Final classification" className="rounded-lg border border-outline-variant bg-surface p-2"
                            value={coordinatorDrafts[finding._id]?.severity ?? finding.coordinatorEditedCopy?.severity ?? finding.leadEditedCopy?.severity ?? finding.severity}
                            onChange={e=>setCoordinatorDrafts(d=>({...d,[finding._id]:{findings:d[finding._id]?.findings ?? finding.coordinatorEditedCopy?.findings ?? finding.leadEditedCopy?.findings ?? finding.findings,severity:e.target.value as "non_conformance"|"open_for_improvement"}}))}>
                            <option value="non_conformance">NC · Non-Conformance</option><option value="open_for_improvement">OFI · Opportunity for Improvement</option>
                          </select>
                          <div className="flex flex-wrap gap-2">
                            <button type="button" disabled={workingFinding!==null} className="rounded-lg border border-primary px-4 py-2 text-primary disabled:opacity-50" onClick={async()=>{try{setWorkingFinding(finding._id);setError(null);const updated=await reviewCoordinatorFinding(finding._id,coordinatorDrafts[finding._id] ?? {findings:finding.coordinatorEditedCopy?.findings ?? finding.leadEditedCopy?.findings ?? finding.findings,severity:finding.coordinatorEditedCopy?.severity ?? finding.leadEditedCopy?.severity ?? finding.severity});setFindings(items=>items.map(x=>x._id===updated._id?updated:x));setCoordinatorDrafts(d=>{const next={...d};delete next[finding._id];return next;});}catch(e){setError(getErrorMessage(e));}finally{setWorkingFinding(null);}}}>Save Changes & Verify</button>
                            <button type="button" disabled={workingFinding!==null || !finding.coordinatorVerifiedAt || Boolean(coordinatorDrafts[finding._id])} className="rounded-lg bg-primary px-4 py-2 text-on-primary disabled:opacity-50" onClick={event=>{approvalFocus.current=event.currentTarget;setPendingConfirmation({kind:"complete",findingId:finding._id})}}>Approve & Lock Finding</button>
                            <button type="button" disabled={workingFinding!==null} className="rounded-lg border border-red-500 px-4 py-2 text-red-700 disabled:opacity-50" onClick={() => setDiscardTargetId(finding._id)}>Discard Finding</button>
                          </div>
                        </div>
                      )}
                      {finding.coordinatorCompletedAt && <p className="mt-4 text-sm text-primary">Verified and completed · Final copy locked</p>}
                      <FindingEvidence findingId={finding._id} files={finding.proofFiles} leadFiles={finding.leadEvidenceFiles} reviews={finding.evidenceReviews} stage={!finding.coordinatorCompletedAt && finding.workflowStatus === "submitted_to_coordinator" ? "coordinator" : undefined} />
                      {finding.proofFiles &&
                        finding.proofFiles.length >
                          0 && (
                          <div className="mt-5 border-t border-outline-variant/20 pt-5">
                            <p className="font-label-md text-on-surface-variant">
                              Proof Files
                            </p>

                            <p className="mt-1 font-body-sm text-on-surface">
                              {
                                finding
                                  .proofFiles
                                  .length
                              }{" "}
                              file
                              {finding
                                .proofFiles
                                .length === 1
                                ? ""
                                : "s"}{" "}
                              attached
                            </p>
                          </div>
                        )}


                      {report && (
                        <div className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
                          Official report generated: <strong>{report.iqrNumber || "IQR created"}</strong> · <a href="/all-reports" className="underline">View All Reports</a>
                        </div>
                      )}
                    </div>
                    </>}
                  </div>
                );
              }
            )}
          </div>
        )}

        {selectedAuditId && findings.length > 0 && (
          <section className="mt-8 rounded-2xl border border-outline-variant/30 bg-surface p-5 sm:p-6" aria-label="Generate reports">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-title-lg text-on-surface">{reportEligible.length === 0 ? "Reports Generated — Audit Finalized" : "Generate Reports"}</h2>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {generatedCount} report-generated · {reportEligible.length - reportEligible.filter(f => Boolean(f.coordinatorCompletedAt)).length} awaiting approval · {reportEligible.filter(f => Boolean(f.coordinatorCompletedAt)).length} ready
                </p>
              </div>
              <a href="/all-reports" className="text-sm font-semibold text-primary underline">View All Reports</a>
            </div>
            {reportEligible.length > 0 && <button type="button" onClick={()=>{setBatchAcknowledged(false);setBatchConfirm(true);}}
              disabled={batchGenerating || auditHeader?.status !== "completed" || !allReady || workingFinding !== null || confirmationBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
              <span className="material-symbols-outlined">{batchGenerating ? "progress_activity" : "description"}</span>
              {batchGenerating ? "Generating Reports..." : `Generate Reports (${reportEligible.length})`}
            </button>}
            {!allReady && reportEligible.length > 0 && <p className="mt-3 text-sm text-on-surface-variant">Approve and lock every remaining finding to enable report generation.</p>}
            {reportEligible.length === 0 && <p className="mt-3 text-sm text-green-700">No findings remain eligible for report generation. Generated reports and discarded findings are retained in their respective records.</p>}
            {batchConfirm && reportEligible.length > 0 && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4"><div role="alertdialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl"><h2 className="font-title-lg">Confirm final report generation</h2><p className="mt-3 text-sm">Please review all findings carefully. Once confirmed, submitted findings cannot be edited, recalled or unsent. Reports will be generated for approved findings only.</p><label className="mt-4 flex items-start gap-3 text-sm"><input type="checkbox" checked={batchAcknowledged} onChange={e=>setBatchAcknowledged(e.target.checked)}/> I understand this action is final.</label><div className="mt-5 flex justify-end gap-3"><button type="button" disabled={batchGenerating} onClick={()=>setBatchConfirm(false)}>Cancel</button><button type="button" disabled={!batchAcknowledged || batchGenerating} onClick={generateAllReports} className="rounded-lg bg-green-600 px-4 py-2 text-white disabled:opacity-50">{batchGenerating?"Generating...":"Confirm & Generate"}</button></div></div></div>}
            {batchMessage && <p role="status" className="mt-3 text-sm font-medium text-green-700">{batchMessage}</p>}
          </section>
        )}
      </div>
    </div>
  );
}
