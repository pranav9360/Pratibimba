import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";

import {
  useApp,
  PRAKALPAS,
  AUDIT_COORDINATORS,
  type ScheduledAudit,
} from "../context/app-context";

import {
  getScheduledAudits,
  updateScheduledAudit as updateScheduledAuditAPI,
  markScheduledAuditCompleted,
} from "../services/scheduledAuditService";

import {
  updateAuditPlan,
} from "../services/auditPlanService";

import SendScheduledAuditEmailModal from "../components/send-scheduled-audit-email-modal";

export default function ScheduledAuditsPage() {
  const { currentUser, auditors } = useApp();

  const [, navigate] = useLocation();

  const [scheduledAudits, setScheduledAudits] =
    useState<ScheduledAudit[]>([]);

  const [editTarget, setEditTarget] =
    useState<ScheduledAudit | null>(null);

  const [mailTarget, setMailTarget] =
    useState<ScheduledAudit | null>(null);

  const [editStartDate, setEditStartDate] =
    useState("");

  const [editEndDate, setEditEndDate] =
    useState("");

  const [editCoordinator, setEditCoordinator] =
    useState("");

  const [editAuditors, setEditAuditors] =
    useState<string[]>([]);

  const [saving, setSaving] =
    useState(false);

  const [editError, setEditError] =
    useState("");

  const [reportTarget, setReportTarget] =
    useState<ScheduledAudit | null>(null);

  const [completionTarget, setCompletionTarget] =
    useState<ScheduledAudit | null>(null);

  const [completionConfirmed, setCompletionConfirmed] =
    useState(false);

  const [completing, setCompleting] =
    useState(false);

  const [completionError, setCompletionError] =
    useState("");

  const [reportConfirmed, setReportConfirmed] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [filterPrakalpa, setFilterPrakalpa] =
    useState("All");

  const [filterLocation, setFilterLocation] =
    useState("All");

  const [filterAuditor, setFilterAuditor] =
    useState("All");

  const [filterStatus, setFilterStatus] =
    useState("All");

  const [filterCoordinator, setFilterCoordinator] =
    useState("All");

  useEffect(() => {
    loadScheduledAudits();
  }, []);

  const loadScheduledAudits = async () => {
    try {
      const data = await getScheduledAudits();

      setScheduledAudits(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Scheduled audits error:",
        err
      );
    }
  };

  const toggleAuditor = (
    auditor: string
  ) => {
    setEditAuditors((prev) =>
      prev.includes(auditor)
        ? prev.filter(
            (a) => a !== auditor
          )
        : [...prev, auditor]
    );
  };

  const canManage =
    currentUser.role === "lead_auditor" ||
    currentUser.role === "admin";

  const isAuditor =
    currentUser.role === "auditor";

  const getStatus = (
    s: ScheduledAudit
  ) => {
    return s.status === "completed"
      ? "completed"
      : "upcoming";
  };

  const canMarkCompleted = (
    s: ScheduledAudit
  ) => {
    if (
      s.status === "completed"
    ) {
      return false;
    }

    const endDate =
      new Date(s.endDate);

    if (
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      return false;
    }

    return new Date() >= endDate;
  };

  const openCompletionReview = (
    audit: ScheduledAudit
  ) => {
    setCompletionTarget(audit);
    setCompletionConfirmed(false);
    setCompletionError("");
  };

  const confirmCompletion =
    async () => {
      if (!completionTarget) {
        return;
      }

      const id =
        completionTarget.id ||
        completionTarget._id;

      if (!id) {
        setCompletionError(
          "Scheduled Audit ID is missing."
        );
        return;
      }

      if (!completionConfirmed) {
        setCompletionError(
          "Please confirm that you have verified all audit details."
        );
        return;
      }

      try {
        setCompleting(true);
        setCompletionError("");

        await markScheduledAuditCompleted(
          id
        );

        await loadScheduledAudits();

        setCompletionTarget(null);
        setCompletionConfirmed(false);
      } catch (err: any) {
        console.error(
          "Failed to complete scheduled audit:",
          err
        );

        setCompletionError(
          err?.response?.data?.message ||
            "Failed to mark the audit as completed."
        );
      } finally {
        setCompleting(false);
      }
    };

  const allLocations = useMemo(
    () => [
      ...new Set(
        scheduledAudits
          .map((s) => s.location)
          .filter(Boolean)
      ),
    ],
    [scheduledAudits]
  );

  const filtered = useMemo(
    () =>
      scheduledAudits.filter((s) => {
        const status =
          getStatus(s);

        const q =
          search
            .trim()
            .toLowerCase();

        const matchSearch =
          !q ||
          s.iqaNumber
            ?.toLowerCase()
            .includes(q) ||
          s.prakalpa
            ?.toLowerCase()
            .includes(q) ||
          s.location
            ?.toLowerCase()
            .includes(q) ||
          (s.sublocation || "")
            .toLowerCase()
            .includes(q) ||
          (s.auditCoordinator || "")
            .toLowerCase()
            .includes(q) ||
          (s.prakalphaPramukh || "")
            .toLowerCase()
            .includes(q);

        const matchUser =
          !isAuditor ||
          (s.auditors || []).includes(
            currentUser.name || ""
          );

        return (
          matchSearch &&
          (filterPrakalpa === "All" ||
            s.prakalpa ===
              filterPrakalpa) &&
          (filterLocation === "All" ||
            s.location ===
              filterLocation) &&
          (filterAuditor === "All" ||
            (s.auditors || []).includes(
              filterAuditor
            )) &&
          (filterStatus === "All" ||
            status ===
              filterStatus.toLowerCase()) &&
          (filterCoordinator === "All" ||
            s.auditCoordinator ===
              filterCoordinator) &&
          matchUser
        );
      }),
    [
      scheduledAudits,
      search,
      filterPrakalpa,
      filterLocation,
      filterAuditor,
      filterStatus,
      filterCoordinator,
      isAuditor,
      currentUser,
    ]
  );

  const statusBadge = (
    s: ScheduledAudit
  ) => {
    const status =
      getStatus(s);

    if (status === "ongoing") {
      return {
        label: "Ongoing",
        cls: "bg-primary/10 text-primary",
      };
    }

    if (status === "upcoming") {
      return {
        label: "Upcoming",
        cls: "bg-secondary/10 text-secondary",
      };
    }

    return {
      label: "Completed",
      cls: "bg-surface-container text-on-surface-variant",
    };
  };

  const openEdit = (
    audit: ScheduledAudit
  ) => {
    setEditError("");

    setEditTarget(audit);

    setEditStartDate(
      audit.startDate
        ? new Date(audit.startDate)
            .toISOString()
            .split("T")[0]
        : ""
    );

    setEditEndDate(
      audit.endDate
        ? new Date(audit.endDate)
            .toISOString()
            .split("T")[0]
        : ""
    );

    setEditCoordinator(
      audit.auditCoordinator || ""
    );

    setEditAuditors(
      audit.auditors || []
    );
  };

  const closeEdit = () => {
    if (saving) return;

    setEditTarget(null);
    setEditStartDate("");
    setEditEndDate("");
    setEditCoordinator("");
    setEditAuditors([]);
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editTarget) {
      return;
    }

    setEditError("");

    if (
      !editStartDate ||
      !editEndDate
    ) {
      setEditError(
        "Start Date and End Date are required."
      );
      return;
    }

    if (
      new Date(editEndDate) <
      new Date(editStartDate)
    ) {
      setEditError(
        "End Date cannot be before Start Date."
      );
      return;
    }

    if (
      !editCoordinator.trim()
    ) {
      setEditError(
        "Audit Coordinator is required."
      );
      return;
    }

    const scheduledAuditId =
      editTarget.id ||
      editTarget._id;

    if (!scheduledAuditId) {
      setEditError(
        "Scheduled Audit ID is missing."
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * Scheduled Audit editing uses ONE backend request.
       *
       * The backend scheduledAuditService synchronizes:
       *
       * AuditPlan:
       * - auditPlannedDate
       * - auditCoordinator
       * - auditors
       *
       * ScheduledAudit:
       * - startDate
       * - endDate
       * - auditCoordinator
       * - auditors
       */
      await updateScheduledAuditAPI(
        scheduledAuditId,
        {
          startDate:
            editStartDate,

          endDate:
            editEndDate,

          auditCoordinator:
            editCoordinator,

          auditors:
            editAuditors,
        }
      );

      await loadScheduledAudits();

      closeEdit();
    } catch (err: any) {
      console.error(
        "Error updating scheduled audit:",
        err
      );

      setEditError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to update scheduled audit."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">

      <div className="flex flex-wrap justify-between items-start gap-4">

        <div>
          <h2 className="font-headline-md text-on-surface">
            Scheduled Audits
          </h2>

          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} audits
          </p>
        </div>

      </div>

      {/* Filters */}

      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">

        <div className="relative w-full sm:flex-1 sm:min-w-[180px]">

          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
            search
          </span>

          <input
            type="text"
            placeholder="Search Audit ID, Prakalpa, Location..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest"
          />

        </div>

        <select
          value={filterPrakalpa}
          onChange={(e) =>
            setFilterPrakalpa(
              e.target.value
            )
          }
          className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >

          <option value="All">
            All Prakalpas
          </option>

          {PRAKALPAS.map((d) => (
            <option
              key={d}
              value={d}
            >
              {d}
            </option>
          ))}

        </select>

        <select
          value={filterLocation}
          onChange={(e) =>
            setFilterLocation(
              e.target.value
            )
          }
          className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >

          <option value="All">
            All Locations
          </option>

          {allLocations.map((l) => (
            <option
              key={l}
              value={l}
            >
              {l}
            </option>
          ))}

        </select>

        {!isAuditor && (
          <select
            value={filterAuditor}
            onChange={(e) =>
              setFilterAuditor(
                e.target.value
              )
            }
            className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          >

            <option value="All">
              All Auditors
            </option>

            {auditors.map((a) => (
              <option
                key={a}
                value={a}
              >
                {a}
              </option>
            ))}

          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) =>
            setFilterStatus(
              e.target.value
            )
          }
          className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >

          <option value="All">
            All Status
          </option>

          <option value="Upcoming">
            Upcoming
          </option>

          <option value="Ongoing">
            Ongoing
          </option>

          <option value="Completed">
            Completed
          </option>

        </select>

        <select
          value={filterCoordinator}
          onChange={(e) =>
            setFilterCoordinator(
              e.target.value
            )
          }
          className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >

          <option value="All">
            All Coordinators
          </option>

          {AUDIT_COORDINATORS.map(
            (c) => (
              <option
                key={c}
                value={c}
              >
                {c}
              </option>
            )
          )}

        </select>

        {(search ||
          filterPrakalpa !== "All" ||
          filterLocation !== "All" ||
          filterAuditor !== "All" ||
          filterStatus !== "All" ||
          filterCoordinator !==
            "All") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterPrakalpa("All");
              setFilterLocation("All");
              setFilterAuditor("All");
              setFilterStatus("All");
              setFilterCoordinator(
                "All"
              );
            }}
            className="font-label-md text-on-surface-variant/60 hover:text-primary"
          >
            Clear
          </button>
        )}

      </div>

      {/* Table */}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">

          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">
            pending_actions
          </span>

          <p className="font-headline-sm text-on-surface-variant/40">
            No scheduled audits
          </p>

        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1180px] text-left">

              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">

                <tr>

                  {[
                    "Audit ID",
                    "Prakalpa",
                    "Location",
                    "Sublocation",
                    "Audit Areas",
                    "Auditors",
                    "Dates",
                    "Coordinator",
                    "Pramukh",
                    "Mail",
                    "Status",
                    ...(canManage
                      ? ["Actions"]
                      : []),
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-3 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[11px]"
                    >
                      {heading}
                    </th>
                  ))}

                </tr>

              </thead>

              <tbody className="divide-y divide-outline-variant/10">

                {filtered.map(
                  (audit, idx) => {
                    const badge =
                      statusBadge(
                        audit
                      );

                    const now =
                      new Date();

                    const start =
                      new Date(
                        audit.startDate
                      );

                    const end =
                      new Date(
                        audit.endDate
                      );

                    const duration =
                      end.getTime() -
                      start.getTime();

                    const pct =
                      duration <= 0
                        ? now >= start
                          ? 100
                          : 0
                        : Math.min(
                            100,
                            Math.max(
                              0,
                              ((now.getTime() -
                                start.getTime()) /
                                duration) *
                                100
                            )
                          );

                    return (
                      <tr
                        key={
                          audit.id ||
                          audit._id ||
                          `audit-${idx}`
                        }
                        className={`hover:bg-surface-container-low transition-colors ${
                          idx % 2 === 1
                            ? "bg-surface-container-lowest/50"
                            : ""
                        }`}
                      >

                        {/* Audit ID */}

                        <td className="px-3 py-3">

                          <p className="font-data-mono text-[12px] text-primary font-bold whitespace-nowrap">
                            {audit.iqaNumber}
                          </p>

                          <div className="h-1 bg-surface-container-high rounded-full mt-1.5 w-20">

                            <div
                              className="h-full bg-primary rounded-full"
                              style={{
                                width: `${pct}%`,
                              }}
                            />

                          </div>

                        </td>

                        {/* Prakalpa */}

                        <td className="px-3 py-3">

                          <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold whitespace-nowrap">
                            {audit.prakalpa}
                          </span>

                        </td>

                        {/* Location */}

                        <td className="px-3 py-3 font-body-md font-medium text-on-surface whitespace-nowrap">
                          {audit.location}
                        </td>

                        {/* Sublocation */}

                        <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">
                          {audit.sublocation ||
                            "—"}
                        </td>

                        {/* Audit Areas */}

                        <td className="px-3 py-3">

                          <div className="flex flex-wrap gap-1 min-w-[140px]">

                            {(audit.auditAreas ||
                              [])
                              .slice(0, 2)
                              .map((area) => (
                                <span
                                  key={area}
                                  className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded text-[10px] whitespace-nowrap"
                                >
                                  {area}
                                </span>
                              ))}

                            {(audit.auditAreas ||
                              []).length >
                              2 && (
                              <span className="text-[10px] text-on-surface-variant whitespace-nowrap">
                                +
                                {(audit.auditAreas ||
                                  []).length -
                                  2}
                              </span>
                            )}

                            {(audit.auditAreas ||
                              []).length ===
                              0 && (
                              <span className="text-[11px] text-on-surface-variant">
                                —
                              </span>
                            )}

                          </div>

                        </td>

                        {/* Auditors */}

                        <td className="px-3 py-3">

                          <div className="space-y-0.5 min-w-[120px]">

                            {(audit.auditors ||
                              []).length >
                            0 ? (
                              audit.auditors.map(
                                (auditor) => (
                                  <p
                                    key={auditor}
                                    className="font-label-md text-[11px] text-on-surface-variant whitespace-nowrap"
                                  >
                                    {auditor}
                                  </p>
                                )
                              )
                            ) : (
                              <p className="font-label-md text-[11px] text-on-surface-variant whitespace-nowrap">
                                Unassigned
                              </p>
                            )}

                          </div>

                        </td>

                        {/* Dates */}

                        <td className="px-3 py-3">

                          <p className="font-data-mono text-[11px] text-on-surface-variant whitespace-nowrap">

                            {new Date(
                              audit.startDate
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month:
                                  "short",
                              }
                            )}

                            {" – "}

                            {new Date(
                              audit.endDate
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month:
                                  "short",
                                year: "2-digit",
                              }
                            )}

                          </p>

                        </td>

                        {/* Coordinator */}

                        <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">
                          {audit.auditCoordinator ||
                            "—"}
                        </td>

                        {/* Pramukh */}

                        <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">
                          {audit.prakalphaPramukh ||
                            "—"}
                        </td>

                        {/* Mail */}

                        <td className="px-3 py-3">

                          {audit.mailSent ? (
                            <span className="flex items-center gap-1 text-secondary text-[11px] font-label-md whitespace-nowrap">

                              <span className="material-symbols-outlined text-[14px]">
                                mark_email_read
                              </span>

                              Sent

                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                setMailTarget(
                                  audit
                                )
                              }
                              className="text-primary hover:underline text-[11px] inline-flex items-center whitespace-nowrap"
                            >

                              <span className="material-symbols-outlined text-[14px] mr-1">
                                mail
                              </span>

                              Send Mail

                            </button>
                          )}

                        </td>

                        {/* Status */}

                        <td className="px-3 py-3 text-center">

                          <div className="flex items-center justify-center">

                            {audit.status === "completed" ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap bg-green-100 text-green-700">
                                Completed
                              </span>
                            ) : canMarkCompleted(
                                audit
                              ) ? (
                              <div className="relative group inline-flex items-center justify-center">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openCompletionReview(
                                      audit
                                    )
                                  }
                                  aria-label="Mark as Completed"
                                  className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    task_alt
                                  </span>
                                </button>

                                <div className="pointer-events-none absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900 text-white text-[10px] font-medium px-2 py-1 rounded shadow-lg">
                                  Mark as Completed
                                </div>

                              </div>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap bg-secondary/10 text-secondary">
                                Upcoming
                              </span>
                            )}

                          </div>

                        </td>

                        {/* Actions */}

                        {canManage && (
                          <td className="px-3 py-3">

                            <div className="flex gap-2 whitespace-nowrap">

                              {audit.status ===
                              "completed" ? (
                                <button
                                  className="px-2 py-1.5 rounded-lg bg-green-600 text-white text-[11px] font-semibold hover:bg-green-700 whitespace-nowrap"
                                  onClick={() => {
                                    setReportTarget(
                                      audit
                                    );

                                    setReportConfirmed(
                                      false
                                    );
                                  }}
                                >
                                  Generate Report
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    openEdit(
                                      audit
                                    )
                                  }
                                  className="p-1.5 rounded-lg hover:bg-surface-container"
                                  title="Edit Scheduled Audit"
                                >
                                  <span className="material-symbols-outlined text-[18px]">
                                    edit
                                  </span>
                                </button>
                              )}

                            </div>

                          </td>
                        )}

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

          <div className="p-4 border-t border-outline-variant/10 font-label-md text-on-surface-variant">

            {filtered.length} of{" "}
            {scheduledAudits.length} audits ·{" "}

            {
              filtered.filter(
                (s) =>
                  getStatus(s) ===
                  "ongoing"
              ).length
            }{" "}
            ongoing ·{" "}

            {
              filtered.filter(
                (s) =>
                  getStatus(s) ===
                  "upcoming"
              ).length
            }{" "}
            upcoming

          </div>

        </div>
      )}

      {/* Edit Modal */}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeEdit}
          />

          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">

            <div className="p-6 border-b border-outline-variant/10">

              <h3 className="font-headline-sm">
                Edit Scheduled Audit
              </h3>

              <p className="font-data-mono text-[11px] text-primary mt-1">
                {editTarget.iqaNumber}
              </p>

              <p className="font-body-md text-on-surface-variant mt-0.5">
                {editTarget.prakalpa} —{" "}
                {editTarget.location}
              </p>

            </div>

            <div className="p-6 space-y-5">

              {editError && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label className="font-label-md text-on-surface-variant block mb-1">
                    Start Date
                  </label>

                  <input
                    type="date"
                    value={
                      editStartDate
                    }
                    onChange={(e) =>
                      setEditStartDate(
                        e.target.value
                      )
                    }
                    disabled={saving}
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100"
                  />

                </div>

                <div>

                  <label className="font-label-md text-on-surface-variant block mb-1">
                    End Date
                  </label>

                  <input
                    type="date"
                    value={
                      editEndDate
                    }
                    onChange={(e) =>
                      setEditEndDate(
                        e.target.value
                      )
                    }
                    min={
                      editStartDate
                    }
                    disabled={saving}
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100"
                  />

                </div>

              </div>

              <div>

                <label className="font-label-md text-on-surface-variant block mb-1">
                  Audit Coordinator
                </label>

                <select
                  value={
                    editCoordinator
                  }
                  onChange={(e) =>
                    setEditCoordinator(
                      e.target.value
                    )
                  }
                  disabled={saving}
                  className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-gray-100"
                >

                  <option value="">
                    Select Coordinator
                  </option>

                  {editCoordinator &&
                    !AUDIT_COORDINATORS.includes(
                      editCoordinator
                    ) && (
                      <option
                        value={
                          editCoordinator
                        }
                      >
                        {editCoordinator}
                      </option>
                    )}

                  {AUDIT_COORDINATORS.map(
                    (coordinator) => (
                      <option
                        key={
                          coordinator
                        }
                        value={
                          coordinator
                        }
                      >
                        {coordinator}
                      </option>
                    )
                  )}

                </select>

              </div>

              <div>

                <label className="font-label-md text-on-surface-variant block mb-2">
                  Auditors
                </label>

                <div className="flex flex-wrap gap-2">

                  {auditors.map(
                    (auditor) => (
                      <button
                        key={
                          auditor
                        }
                        type="button"
                        disabled={
                          saving
                        }
                        onClick={() =>
                          toggleAuditor(
                            auditor
                          )
                        }
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all disabled:opacity-60 ${
                          editAuditors.includes(
                            auditor
                          )
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-white text-on-surface-variant border-outline-variant"
                        }`}
                      >
                        {auditor}
                      </button>
                    )
                  )}

                </div>

              </div>

              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={
                    closeEdit
                  }
                  disabled={saving}
                  className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    saveEdit
                  }
                  disabled={saving}
                  className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* Send Scheduled Audit Email */}

      {mailTarget && (
        <SendScheduledAuditEmailModal
          audit={{
            _id:
              mailTarget._id ||
              mailTarget.id,
            id:
              mailTarget.id,
            iqaNumber:
              mailTarget.iqaNumber,
            prakalpa:
              mailTarget.prakalpa,
            location:
              mailTarget.location,
            startDate:
              mailTarget.startDate,
            endDate:
              mailTarget.endDate,
            auditCoordinator:
              mailTarget.auditCoordinator,
          }}
          onClose={() =>
            setMailTarget(null)
          }
          onSent={async () => {
            await loadScheduledAudits();
          }}
        />
      )}

      {/* Complete Audit Verification Modal */}

      {completionTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!completing) {
                setCompletionTarget(null);
                setCompletionConfirmed(false);
                setCompletionError("");
              }
            }}
          />

          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto">

            <div className="p-6 border-b border-outline-variant/10">

              <div className="flex items-start justify-between gap-4">

                <div>

                  <h3 className="font-headline-sm font-bold text-on-surface">
                    Verify Audit Details
                  </h3>

                  <p className="font-body-md text-on-surface-variant mt-1">
                    Please verify all details before marking this audit as completed.
                  </p>

                </div>

                <button
                  type="button"
                  disabled={completing}
                  onClick={() => {
                    setCompletionTarget(null);
                    setCompletionConfirmed(false);
                    setCompletionError("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-50"
                >
                  <span className="material-symbols-outlined">
                    close
                  </span>
                </button>

              </div>

            </div>

            <div className="p-6 space-y-5">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Audit ID
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.iqaNumber}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Prakalpa
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.prakalpa || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Location
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.location || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Sublocation
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.sublocation || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Coordinator
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.auditCoordinator || "—"}
                  </p>
                </div>

                <div className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Pramukh
                  </p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {completionTarget.prakalphaPramukh || "—"}
                  </p>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="rounded-xl border border-outline-variant/20 p-4">

                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    Start Date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {new Date(
                      completionTarget.startDate
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </p>

                </div>

                <div className="rounded-xl border border-outline-variant/20 p-4">

                  <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                    End Date
                  </p>

                  <p className="mt-1 text-sm font-semibold text-on-surface">
                    {new Date(
                      completionTarget.endDate
                    ).toLocaleDateString(
                      "en-IN",
                      {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </p>

                </div>

              </div>

              <div className="rounded-xl border border-outline-variant/20 p-4">

                <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">
                  Audit Areas
                </p>

                <div className="flex flex-wrap gap-2">

                  {(completionTarget.auditAreas || []).length > 0 ? (
                    completionTarget.auditAreas?.map(
                      (area) => (
                        <span
                          key={area}
                          className="px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs"
                        >
                          {area}
                        </span>
                      )
                    )
                  ) : (
                    <span className="text-sm text-on-surface-variant">
                      —
                    </span>
                  )}

                </div>

              </div>

              <div className="rounded-xl border border-outline-variant/20 p-4">

                <p className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">
                  Auditors
                </p>

                <div className="flex flex-wrap gap-2">

                  {(completionTarget.auditors || []).length > 0 ? (
                    completionTarget.auditors?.map(
                      (auditor) => (
                        <span
                          key={auditor}
                          className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs"
                        >
                          {auditor}
                        </span>
                      )
                    )
                  ) : (
                    <span className="text-sm text-on-surface-variant">
                      Unassigned
                    </span>
                  )}

                </div>

              </div>

              <label className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 cursor-pointer">

                <input
                  type="checkbox"
                  checked={completionConfirmed}
                  onChange={(e) =>
                    setCompletionConfirmed(
                      e.target.checked
                    )
                  }
                  disabled={completing}
                  className="mt-1"
                />

                <div>

                  <p className="text-sm font-bold text-on-surface">
                    I have verified all audit details
                  </p>

                  <p className="text-xs text-on-surface-variant mt-1">
                    After confirmation, this Scheduled Audit and its linked Audit Plan will be marked Completed.
                  </p>

                </div>

              </label>

              {completionError && (
                <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
                  {completionError}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3">

              <button
                type="button"
                disabled={completing}
                onClick={() => {
                  setCompletionTarget(null);
                  setCompletionConfirmed(false);
                  setCompletionError("");
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg font-label-md disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={completing}
                onClick={() => {
                  const id =
                    completionTarget.id ||
                    completionTarget._id;

                  if (!id) {
                    setCompletionError(
                      "Scheduled Audit ID is missing."
                    );
                    return;
                  }

                  setCompletionTarget(null);
                  setCompletionConfirmed(false);
                  setCompletionError("");

                  navigate(
                    `/scheduled-audits/${id}/edit`
                  );
                }}
                className="px-4 py-2 border border-primary text-primary rounded-lg font-label-md font-bold hover:bg-primary/5 disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[17px]">
                  edit
                </span>

                Edit Details
              </button>

              <button
                type="button"
                onClick={confirmCompletion}
                disabled={
                  completing ||
                  !completionConfirmed
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-label-md font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing
                  ? "Completing..."
                  : "Confirm & Mark Completed"}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* Generate Report Confirmation */}

      {reportTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/40"
            onClick={() =>
              setReportTarget(null)
            }
          />

          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-md z-10">

            <div className="p-6 border-b border-outline-variant/10">

              <h3 className="font-headline-sm">
                Generate Audit Report
              </h3>

              <p className="mt-2 font-data-mono text-primary text-[12px] font-bold">
                {reportTarget.iqaNumber}
              </p>

              <p className="mt-3 text-sm text-on-surface-variant font-body-md">
                Please verify that the audit has been completed before generating the report.
              </p>

            </div>

            <div className="p-6">

              <label className="flex items-start gap-3 cursor-pointer">

                <input
                  type="checkbox"
                  checked={
                    reportConfirmed
                  }
                  onChange={(e) =>
                    setReportConfirmed(
                      e.target.checked
                    )
                  }
                  className="mt-1 rounded border-outline-variant text-primary focus:ring-primary/20"
                />

                <span className="font-body-md text-on-surface text-sm">
                  I confirm that this audit has been completed.
                </span>

              </label>

            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-outline-variant/10">

              <button
                onClick={() => {
                  setReportTarget(null);
                  setReportConfirmed(false);
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
              >
                Cancel
              </button>

              <button
                disabled={
                  !reportConfirmed
                }
                onClick={() => {
                  const id =
                    reportTarget.id ||
                    reportTarget._id;

                  if (!id) return;

                  setReportTarget(null);
                  setReportConfirmed(false);

                  navigate(
                    `/create-report/${id}`
                  );
                }}
                className={`px-4 py-2 rounded-lg text-white font-label-md font-bold transition-all ${
                  reportConfirmed
                    ? "bg-primary hover:brightness-110 cursor-pointer"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
              >
                Generate Report
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
