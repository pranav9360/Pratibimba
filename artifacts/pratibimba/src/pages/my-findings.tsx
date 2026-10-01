import { useEffect, useMemo, useState } from "react";

import { useApp } from "../context/app-context";

import {
  getAuditFindings,
  resubmitAuditFindingToLead,
  type AuditFinding,
} from "../services/auditFindingService";


type EditableFinding = {
  auditArea: string;
  findings: string;
  severity:
    | "open_for_improvement"
    | "non_conformance";
  visitDate: string;
  visitTime: string;
};


const statusLabels: Record<string, string> = {
  submitted_to_lead: "Submitted to Lead",
  returned_to_auditor: "Returned for Correction",
  approved_by_lead: "Approved by Lead",
  submitted_to_coordinator: "Submitted to Coordinator",
  converted_to_report: "Converted to IQR",
};


function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}


function toDateInput(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}


export default function MyFindingsPage() {
  const { currentUser } = useApp();

  const [findings, setFindings] =
    useState<AuditFinding[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [form, setForm] =
    useState<EditableFinding | null>(null);

  const [saving, setSaving] =
    useState(false);


  const loadFindings = async () => {
    setLoading(true);
    setError("");

    try {
      /*
       * IMPORTANT:
       * No Auditor filtering is performed here.
       *
       * GET /audit-findings is jurisdiction-filtered by the
       * backend using the authenticated User ObjectId.
       */
      const data =
        await getAuditFindings();

      setFindings(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Failed to load audit findings:",
        err
      );

      setError(
        "Unable to load your findings."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadFindings();
  }, []);


  const counts = useMemo(() => {
    return {
      total: findings.length,

      withLead: findings.filter(
        (item) =>
          item.workflowStatus ===
          "submitted_to_lead"
      ).length,

      returned: findings.filter(
        (item) =>
          item.workflowStatus ===
          "returned_to_auditor"
      ).length,

      coordinator: findings.filter(
        (item) =>
          item.workflowStatus ===
            "submitted_to_coordinator" ||
          item.workflowStatus ===
            "converted_to_report"
      ).length,
    };
  }, [findings]);


  const beginCorrection = (
    finding: AuditFinding
  ) => {
    if (
      finding.workflowStatus !==
      "returned_to_auditor"
    ) {
      return;
    }

    setEditingId(
      finding._id || finding.id || ""
    );

    setForm({
      auditArea:
        finding.auditArea || "",

      findings:
        finding.findings || "",

      severity:
        finding.severity,

      visitDate:
        toDateInput(
          finding.visitDate
        ),

      visitTime:
        finding.visitTime || "",
    });
  };


  const cancelCorrection = () => {
    setEditingId(null);
    setForm(null);
  };


  const submitCorrection = async (
    id: string
  ) => {
    if (!form) return;

    if (
      !form.auditArea.trim() ||
      !form.findings.trim() ||
      !form.severity ||
      !form.visitDate ||
      !form.visitTime
    ) {
      alert(
        "Please complete all required finding fields."
      );
      return;
    }

    setSaving(true);

    try {
      await resubmitAuditFindingToLead(
        id,
        {
          auditArea:
            form.auditArea.trim(),

          findings:
            form.findings.trim(),

          severity:
            form.severity,

          visitDate:
            form.visitDate,

          visitTime:
            form.visitTime,
        }
      );

      cancelCorrection();

      await loadFindings();
    } catch (err) {
      console.error(
        "Failed to resubmit finding:",
        err
      );

      alert(
        "Failed to resubmit the finding. Please review the correction and try again."
      );
    } finally {
      setSaving(false);
    }
  };


  if (
    currentUser?.role !== "auditor"
  ) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto rounded-2xl border border-outline-variant bg-surface-container-low p-6">
          <h1 className="font-headline-sm text-on-surface">
            My Findings
          </h1>

          <p className="mt-2 font-body-md text-on-surface-variant">
            This workspace is available to Auditors.
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="font-headline-md text-on-surface">
            My Findings
          </h1>

          <p className="mt-2 font-body-md text-on-surface-variant">
            Track findings submitted to the Lead Auditor
            and correct any findings returned for revision.
          </p>
        </div>


        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">

          <SummaryCard
            label="Total Findings"
            value={counts.total}
          />

          <SummaryCard
            label="With Lead"
            value={counts.withLead}
          />

          <SummaryCard
            label="Returned"
            value={counts.returned}
          />

          <SummaryCard
            label="Coordinator"
            value={counts.coordinator}
          />

        </div>


        {loading && (
          <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-8 text-center font-body-md text-on-surface-variant">
            Loading your findings...
          </div>
        )}


        {!loading && error && (
          <div className="rounded-2xl border border-error/30 bg-error-container/20 p-6">
            <p className="font-body-md text-error">
              {error}
            </p>

            <button
              type="button"
              onClick={loadFindings}
              className="mt-4 rounded-full bg-primary px-5 py-2 font-label-lg text-on-primary"
            >
              Retry
            </button>
          </div>
        )}


        {!loading &&
          !error &&
          findings.length === 0 && (
            <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-10 text-center">

              <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40">
                fact_check
              </span>

              <h2 className="mt-3 font-headline-sm text-on-surface">
                No findings submitted yet
              </h2>

              <p className="mt-2 font-body-md text-on-surface-variant">
                Findings you submit from a Scheduled Audit
                will appear here.
              </p>

            </div>
          )}


        {!loading &&
          !error &&
          findings.length > 0 && (
            <div className="space-y-4">

              {findings.map(
                (finding) => {
                  const id =
                    finding._id ||
                    finding.id ||
                    "";

                  const isReturned =
                    finding.workflowStatus ===
                    "returned_to_auditor";

                  const isEditing =
                    editingId === id;

                  return (
                    <article
                      key={id}
                      className="rounded-2xl border border-outline-variant bg-surface-container-low overflow-hidden"
                    >

                      <div className="p-5 sm:p-6">

                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                          <div>
                            <div className="flex flex-wrap items-center gap-2">

                              <span className="font-label-lg text-primary">
                                {finding.iqaNumber ||
                                  "Audit Finding"}
                              </span>

                              <StatusBadge
                                status={
                                  finding.workflowStatus
                                }
                              />

                            </div>

                            <h2 className="mt-2 font-title-lg text-on-surface">
                              {finding.auditArea ||
                                "Audit Finding"}
                            </h2>

                            <p className="mt-1 font-body-sm text-on-surface-variant">
                              {finding.prakalpa || "—"}
                              {finding.location
                                ? ` • ${finding.location}`
                                : ""}
                            </p>
                          </div>


                          <div className="text-left sm:text-right">

                            <p className="font-label-md text-on-surface-variant">
                              Severity
                            </p>

                            <p className="font-body-md font-medium text-on-surface">
                              {finding.severity ===
                              "non_conformance"
                                ? "Non-Conformance"
                                : "Open for Improvement"}
                            </p>

                          </div>
                        </div>


                        {!isEditing && (
                          <>
                            <div className="mt-5 rounded-xl bg-surface p-4">
                              <p className="font-label-md text-on-surface-variant mb-1">
                                Finding
                              </p>

                              <p className="font-body-md text-on-surface whitespace-pre-wrap">
                                {finding.findings}
                              </p>
                            </div>


                            <div className="grid sm:grid-cols-3 gap-4 mt-5">

                              <Detail
                                label="Visit Date"
                                value={formatDate(
                                  finding.visitDate
                                )}
                              />

                              <Detail
                                label="Visit Time"
                                value={
                                  finding.visitTime ||
                                  "—"
                                }
                              />

                              <Detail
                                label="Submitted"
                                value={formatDate(
                                  finding.createdAt
                                )}
                              />

                            </div>


                            {finding.leadReviewRemarks && (
                              <div
                                className={`mt-5 rounded-xl p-4 ${
                                  isReturned
                                    ? "bg-error-container/20 border border-error/20"
                                    : "bg-surface"
                                }`}
                              >
                                <p className="font-label-md text-on-surface-variant">
                                  Lead Auditor Remarks
                                </p>

                                <p className="mt-1 font-body-md text-on-surface whitespace-pre-wrap">
                                  {
                                    finding.leadReviewRemarks
                                  }
                                </p>
                              </div>
                            )}


                            {isReturned && (
                              <div className="mt-5 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() =>
                                    beginCorrection(
                                      finding
                                    )
                                  }
                                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-label-lg text-on-primary hover:opacity-90"
                                >
                                  <span className="material-symbols-outlined text-[20px]">
                                    edit
                                  </span>

                                  Correct & Resubmit
                                </button>
                              </div>
                            )}
                          </>
                        )}


                        {isEditing &&
                          form && (
                            <div className="mt-6 border-t border-outline-variant pt-6">

                              <div className="mb-5">
                                <h3 className="font-title-md text-on-surface">
                                  Correct Finding
                                </h3>

                                <p className="mt-1 font-body-sm text-on-surface-variant">
                                  Saving this correction will
                                  resubmit the finding to the
                                  Lead Auditor.
                                </p>
                              </div>


                              <div className="grid gap-5">

                                <label className="block">
                                  <span className="font-label-md text-on-surface">
                                    Audit Area
                                  </span>

                                  <input
                                    value={
                                      form.auditArea
                                    }
                                    onChange={(e) =>
                                      setForm({
                                        ...form,
                                        auditArea:
                                          e.target
                                            .value,
                                      })
                                    }
                                    className="mt-2 w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface outline-none focus:border-primary"
                                  />
                                </label>


                                <label className="block">
                                  <span className="font-label-md text-on-surface">
                                    Finding
                                  </span>

                                  <textarea
                                    rows={5}
                                    value={
                                      form.findings
                                    }
                                    onChange={(e) =>
                                      setForm({
                                        ...form,
                                        findings:
                                          e.target
                                            .value,
                                      })
                                    }
                                    className="mt-2 w-full resize-y rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface outline-none focus:border-primary"
                                  />
                                </label>


                                <div className="grid sm:grid-cols-3 gap-4">

                                  <label>
                                    <span className="font-label-md text-on-surface">
                                      Severity
                                    </span>

                                    <select
                                      value={
                                        form.severity
                                      }
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          severity:
                                            e.target
                                              .value as EditableFinding["severity"],
                                        })
                                      }
                                      className="mt-2 w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                                    >
                                      <option value="open_for_improvement">
                                        Open for Improvement
                                      </option>

                                      <option value="non_conformance">
                                        Non-Conformance
                                      </option>
                                    </select>
                                  </label>


                                  <label>
                                    <span className="font-label-md text-on-surface">
                                      Visit Date
                                    </span>

                                    <input
                                      type="date"
                                      value={
                                        form.visitDate
                                      }
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          visitDate:
                                            e.target
                                              .value,
                                        })
                                      }
                                      className="mt-2 w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                                    />
                                  </label>


                                  <label>
                                    <span className="font-label-md text-on-surface">
                                      Visit Time
                                    </span>

                                    <input
                                      type="time"
                                      value={
                                        form.visitTime
                                      }
                                      onChange={(e) =>
                                        setForm({
                                          ...form,
                                          visitTime:
                                            e.target
                                              .value,
                                        })
                                      }
                                      className="mt-2 w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-on-surface"
                                    />
                                  </label>

                                </div>


                                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">

                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={
                                      cancelCorrection
                                    }
                                    className="rounded-full border border-outline-variant px-5 py-2.5 font-label-lg text-on-surface"
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() =>
                                      submitCorrection(
                                        id
                                      )
                                    }
                                    className="rounded-full bg-primary px-5 py-2.5 font-label-lg text-on-primary disabled:opacity-50"
                                  >
                                    {saving
                                      ? "Resubmitting..."
                                      : "Resubmit to Lead Auditor"}
                                  </button>

                                </div>

                              </div>
                            </div>
                          )}

                      </div>
                    </article>
                  );
                }
              )}

            </div>
          )}

      </div>
    </div>
  );
}


function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 sm:p-5">
      <p className="font-label-md text-on-surface-variant">
        {label}
      </p>

      <p className="mt-1 font-headline-md text-on-surface">
        {value}
      </p>
    </div>
  );
}


function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="font-label-md text-on-surface-variant">
        {label}
      </p>

      <p className="mt-1 font-body-md text-on-surface">
        {value}
      </p>
    </div>
  );
}


function StatusBadge({
  status,
}: {
  status: string;
}) {
  const returned =
    status === "returned_to_auditor";

  const completed =
    status === "converted_to_report";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 font-label-sm ${
        returned
          ? "bg-error-container text-on-error-container"
          : completed
          ? "bg-tertiary-container text-on-tertiary-container"
          : "bg-secondary-container text-on-secondary-container"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
