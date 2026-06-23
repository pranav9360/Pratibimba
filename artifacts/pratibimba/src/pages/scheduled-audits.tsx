import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  getScheduledAudits,
  updateScheduledAudit,
  type AuditPlan,
  type Location,
  type Prakalpa,
  type ScheduledAudit
} from "../lib/api";

const AUDITORS = [
  "Ananya Iyer",
  "Ravi Kumar",
  "Meera Sharma",
  "Arjun Rao",
  "Priya Nair"
];

type DisplayStatus = "upcoming" | "ongoing" | "completed";

function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatShortDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short"
  });
}

function getAuditId(audit: ScheduledAudit) {
  if (audit.auditId) return audit.auditId;

  if (
    typeof audit.auditPlanId === "object" &&
    audit.auditPlanId &&
    "auditId" in audit.auditPlanId
  ) {
    return (audit.auditPlanId as AuditPlan).auditId;
  }

  return "Unknown Audit";
}

function getPrakalpaName(audit: ScheduledAudit) {
  if (
    typeof audit.prakalpaId === "object" &&
    audit.prakalpaId &&
    "name" in audit.prakalpaId
  ) {
    return (audit.prakalpaId as Prakalpa).name;
  }

  return "Unknown Prakalpa";
}

function getLocationName(audit: ScheduledAudit) {
  if (
    typeof audit.locationId === "object" &&
    audit.locationId &&
    "name" in audit.locationId
  ) {
    return (audit.locationId as Location).name;
  }

  return "No location";
}

function getSavedUser() {
  try {
    const saved = localStorage.getItem("pratibimba_user");
    if (!saved) return null;
    return JSON.parse(saved) as { name?: string; role?: string };
  } catch {
    return null;
  }
}

function getDisplayStatus(audit: ScheduledAudit): DisplayStatus {
  if (audit.status === "completed") return "completed";
  if (audit.status === "in_progress") return "ongoing";

  const now = new Date();
  const start = new Date(audit.auditStartDate || "");
  const end = new Date(audit.auditEndDate || "");

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "upcoming";
  }

  if (start > now) return "upcoming";
  if (end < now) return "completed";
  return "ongoing";
}

function getProgressPercent(audit: ScheduledAudit) {
  const start = new Date(audit.auditStartDate || "").getTime();
  const end = new Date(audit.auditEndDate || "").getTime();
  const now = new Date().getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return getDisplayStatus(audit) === "completed" ? 100 : 0;
  }

  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}

function statusBadge(audit: ScheduledAudit) {
  const status = getDisplayStatus(audit);

  const styleMap: Record<DisplayStatus, string> = {
    ongoing: "bg-primary/10 text-primary",
    upcoming: "bg-secondary/10 text-secondary",
    completed: "bg-surface-container text-on-surface-variant"
  };

  const labelMap: Record<DisplayStatus, string> = {
    ongoing: "Ongoing",
    upcoming: "Upcoming",
    completed: "Completed"
  };

  return {
    style: styleMap[status],
    label: labelMap[status]
  };
}

interface EditScheduleModalProps {
  audit: ScheduledAudit;
  onClose: () => void;
  onUpdated: () => void;
}

function EditScheduleModal({
  audit,
  onClose,
  onUpdated
}: EditScheduleModalProps) {
  const [auditStartDate, setAuditStartDate] = useState(
    audit.auditStartDate?.split("T")[0] || ""
  );
  const [auditEndDate, setAuditEndDate] = useState(
    audit.auditEndDate?.split("T")[0] || ""
  );
  const [finalizedAuditor, setFinalizedAuditor] = useState(
    audit.finalizedAuditor || AUDITORS[0]
  );
  const [auditPurpose, setAuditPurpose] = useState(audit.auditPurpose || "");
  const [status, setStatus] = useState<
    "scheduled" | "in_progress" | "completed"
  >(audit.status || "scheduled");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await updateScheduledAudit(audit._id, {
        auditStartDate,
        auditEndDate,
        finalizedAuditor,
        auditPurpose,
        status
      });

      await onUpdated();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update scheduled audit"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Edit Scheduled Audit</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">
            {getAuditId(audit)}
          </p>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {getPrakalpaName(audit)}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 font-body-md">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={auditStartDate}
                onChange={(e) => setAuditStartDate(e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                End Date
              </label>
              <input
                type="date"
                value={auditEndDate}
                onChange={(e) => setAuditEndDate(e.target.value)}
                min={auditStartDate}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Final Auditor
            </label>
            <select
              value={finalizedAuditor}
              onChange={(e) => setFinalizedAuditor(e.target.value)}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              {AUDITORS.map((auditor) => (
                <option key={auditor}>{auditor}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "scheduled" | "in_progress" | "completed"
                )
              }
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Audit Purpose
            </label>
            <textarea
              value={auditPurpose}
              onChange={(e) => setAuditPurpose(e.target.value)}
              rows={3}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-40"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReportPromptModalProps {
  audit: ScheduledAudit;
  onClose: () => void;
}

function ReportPromptModal({ audit, onClose }: ReportPromptModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-md z-10 p-6 text-center space-y-5">
        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-secondary text-[32px]">
            description
          </span>
        </div>

        <div>
          <h3 className="font-headline-sm mb-1">Create Audit Report</h3>
          <p className="font-data-mono text-[12px] text-primary mb-1">
            {getAuditId(audit)}
          </p>
          <p className="font-body-md text-on-surface-variant">
            {getPrakalpaName(audit)} — {audit.auditPurpose || "Audit"}
          </p>
        </div>

        <div className="bg-surface-container-lowest rounded-lg p-4 text-left space-y-2">
          <div className="flex justify-between font-body-md">
            <span className="text-on-surface-variant">Final Auditor</span>
            <span className="font-medium text-on-surface">
              {audit.finalizedAuditor || "-"}
            </span>
          </div>

          <div className="flex justify-between font-body-md">
            <span className="text-on-surface-variant">Period</span>
            <span className="font-medium text-on-surface">
              {formatShortDate(audit.auditStartDate)} –{" "}
              {formatShortDate(audit.auditEndDate)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md"
          >
            Cancel
          </button>

          <Link
            href={`/create-report/${audit._id}`}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold text-center"
          >
            Create Report
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledAuditsPage() {
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>([]);
  const [editTarget, setEditTarget] = useState<ScheduledAudit | null>(null);
  const [reportTarget, setReportTarget] = useState<ScheduledAudit | null>(null);
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const savedUser = getSavedUser();
  const isChief = savedUser?.role === "chief_auditor";
  const isAuditor = savedUser?.role === "auditor";

  async function loadScheduledAudits() {
    try {
      setPageError("");
      const data = await getScheduledAudits();
      setScheduledAudits(data);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load scheduled audits"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadScheduledAudits();
  }, []);

  const prakalpaOptions = useMemo(() => {
    return Array.from(
      new Set(scheduledAudits.map((audit) => getPrakalpaName(audit)))
    ).filter((name) => name && name !== "Unknown Prakalpa");
  }, [scheduledAudits]);

  const auditorOptions = useMemo(() => {
    return Array.from(
      new Set(
        scheduledAudits
          .map((audit) => audit.finalizedAuditor)
          .filter((auditor): auditor is string => Boolean(auditor))
      )
    );
  }, [scheduledAudits]);

  const filtered = useMemo(() => {
    return scheduledAudits.filter((audit) => {
      const status = getDisplayStatus(audit);
      const prakalpaName = getPrakalpaName(audit);
      const locationName = getLocationName(audit);
      const auditId = getAuditId(audit);

      const searchText = [
        auditId,
        prakalpaName,
        locationName,
        audit.auditCoordinator,
        audit.finalizedAuditor,
        audit.auditPurpose,
        audit.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch =
        search.trim() === "" ||
        searchText.includes(search.trim().toLowerCase());

      const matchPrakalpa =
        filterPrakalpa === "All" || prakalpaName === filterPrakalpa;

      const matchAuditor =
        filterAuditor === "All" || audit.finalizedAuditor === filterAuditor;

      const matchStatus =
        filterStatus === "All" || status === filterStatus.toLowerCase();

      const matchUser =
        !isAuditor || audit.finalizedAuditor === savedUser?.name;

      return (
        matchSearch &&
        matchPrakalpa &&
        matchAuditor &&
        matchStatus &&
        matchUser
      );
    });
  }, [
    scheduledAudits,
    search,
    filterPrakalpa,
    filterAuditor,
    filterStatus,
    isAuditor,
    savedUser?.name
  ]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-8">
          <p className="font-body-md text-on-surface-variant">
            Loading scheduled audits...
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          <p className="font-label-md font-bold">
            Scheduled audits failed to load
          </p>
          <p className="font-body-md mt-1">{pageError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">
            Scheduled Audits
          </h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} audits{" "}
            {isAuditor ? "assigned to you" : "from backend MongoDB"}
          </p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search audit ID, Prakalpa, location, auditor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest"
          />
        </div>

        <select
          value={filterPrakalpa}
          onChange={(e) => setFilterPrakalpa(e.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Prakalpa</option>
          {prakalpaOptions.map((prakalpa) => (
            <option key={prakalpa}>{prakalpa}</option>
          ))}
        </select>

        {!isAuditor && (
          <select
            value={filterAuditor}
            onChange={(e) => setFilterAuditor(e.target.value)}
            className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          >
            <option value="All">All Auditors</option>
            {auditorOptions.map((auditor) => (
              <option key={auditor}>{auditor}</option>
            ))}
          </select>
        )}

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Status</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>

        {(search ||
          filterPrakalpa !== "All" ||
          filterAuditor !== "All" ||
          filterStatus !== "All") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterPrakalpa("All");
              setFilterAuditor("All");
              setFilterStatus("All");
            }}
            className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">
            calendar_month
          </span>
          <p className="font-headline-sm text-on-surface-variant/40">
            No scheduled audits found
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((audit) => {
            const { style, label } = statusBadge(audit);

            return (
              <div
                key={audit._id}
                className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden"
              >
                <div className="p-5 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-data-mono text-[12px] text-primary font-bold">
                        {getAuditId(audit)}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${style}`}
                      >
                        {label}
                      </span>
                    </div>

                    <h3 className="font-headline-sm text-on-surface">
                      {getPrakalpaName(audit)}
                    </h3>

                    <p className="font-body-md text-on-surface-variant">
                      {audit.auditPurpose || "No purpose added"}
                    </p>

                    <div className="flex flex-wrap gap-6 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                          location_on
                        </span>
                        <span className="font-label-md text-on-surface-variant">
                          {getLocationName(audit)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                          supervisor_account
                        </span>
                        <span className="font-label-md text-on-surface-variant">
                          {audit.auditCoordinator || "No coordinator"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                          person
                        </span>
                        <span className="font-label-md text-on-surface-variant">
                          {audit.finalizedAuditor || "No auditor"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                          date_range
                        </span>
                        <span className="font-data-mono text-[12px] text-on-surface-variant">
                          {formatShortDate(audit.auditStartDate)} –{" "}
                          {formatDate(audit.auditEndDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                          event
                        </span>
                        <span className="font-label-md text-on-surface-variant/70">
                          Planned: {formatDate(audit.auditPlannedDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {(isChief ||
                      (isAuditor &&
                        audit.finalizedAuditor === savedUser?.name)) && (
                      <button
                        onClick={() => setReportTarget(audit)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-md font-bold hover:brightness-110 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          description
                        </span>
                        Create Report
                      </button>
                    )}

                    {isChief && (
                      <button
                        onClick={() => setEditTarget(audit)}
                        className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          edit
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-1 bg-surface-container-high">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${getProgressPercent(audit)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editTarget && (
        <EditScheduleModal
          audit={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={loadScheduledAudits}
        />
      )}

      {reportTarget && (
        <ReportPromptModal
          audit={reportTarget}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}