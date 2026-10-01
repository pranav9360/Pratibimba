import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AuditFinding,
  generateReportFromFinding,
  getAuditFindings,
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

          const data =
            await getAuditFindings();

          /*
           * Backend jurisdiction is authoritative.
           *
           * This frontend filter is only defensive UI filtering.
           */
          const coordinatorFindings =
            (data || []).filter(
              (finding) =>
                finding.workflowStatus ===
                "submitted_to_coordinator"
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
      []
    );


  useEffect(() => {
    loadFindings();
  }, [loadFindings]);


  const handleGenerate =
    async (
      finding: AuditFinding
    ) => {
      const confirmed =
        window.confirm(
          "Generate the official IQR for this finding?\n\n" +
          "The backend will assign the official IQR number."
        );

      if (!confirmed) {
        return;
      }

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

        <div className="mb-8">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <span className="material-symbols-outlined text-[28px] text-primary">
                fact_check
              </span>
            </div>

            <div>
              <h1 className="font-headline-md text-on-surface">
                Coordinator Findings
              </h1>

              <p className="mt-1 font-body-md text-on-surface-variant">
                Review Lead Auditor approved findings and generate official IQRs.
              </p>
            </div>
          </div>
        </div>


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
                Awaiting IQR Generation
              </p>

              <p className="font-body-sm text-on-surface-variant">
                Only findings forwarded by the Lead Auditor and assigned to you are shown.
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
                                finding.severity
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
                            {finding.findings ||
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


                      {report ? (
                        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex gap-3">
                              <span className="material-symbols-outlined text-[28px] text-primary">
                                verified
                              </span>

                              <div>
                                <p className="font-label-lg text-on-surface">
                                  Official IQR Generated
                                </p>

                                <p className="mt-1 font-headline-sm text-primary">
                                  {report.iqrNumber ||
                                    "IQR generated"}
                                </p>
                              </div>
                            </div>

                            <a
                              href="/all-reports"
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-primary px-5 py-2.5 font-label-md text-primary hover:bg-primary/5"
                            >
                              <span className="material-symbols-outlined text-[20px]">
                                description
                              </span>
                              View Reports
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-6 flex flex-col gap-3 border-t border-outline-variant/20 pt-5 sm:flex-row sm:items-center sm:justify-between">
                          <p className="max-w-2xl font-body-sm text-on-surface-variant">
                            Generating an IQR creates the official Report. The official IQR number is assigned by the backend.
                          </p>

                          <button
                            type="button"
                            disabled={
                              generating
                            }
                            onClick={() =>
                              handleGenerate(
                                finding
                              )
                            }
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-label-md text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span
                              className={`material-symbols-outlined text-[20px] ${
                                generating
                                  ? "animate-spin"
                                  : ""
                              }`}
                            >
                              {generating
                                ? "progress_activity"
                                : "post_add"}
                            </span>

                            {generating
                              ? "Generating..."
                              : "Generate Official IQR"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </div>
  );
}
