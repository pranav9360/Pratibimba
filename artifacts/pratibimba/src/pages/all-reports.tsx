import { useEffect, useMemo, useState } from "react";
import {
  getReports,
  updateReport,
  type Location,
  type Prakalpa,
  type Report,
  type ScheduledAudit,
  type UpdateReportPayload
} from "../lib/api";

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

function inputDate(value?: string) {
  if (!value) return "";
  return value.split("T")[0];
}

function getSavedUser() {
  try {
    const saved = localStorage.getItem("pratibimba_user");
    if (!saved) return null;
    return JSON.parse(saved) as {
      name?: string;
      role?: "chief_auditor" | "auditor" | "prakalpa_manager";
      prakalpaId?: string | null;
    };
  } catch {
    return null;
  }
}

function getReportId(report: Report) {
  return report.reportId || "Unknown Report";
}

function getAuditRef(report: Report) {
  return report.auditId || "Unknown Audit";
}

function getPrakalpaName(report: Report) {
  if (
    typeof report.prakalpaId === "object" &&
    report.prakalpaId &&
    "name" in report.prakalpaId
  ) {
    return (report.prakalpaId as Prakalpa).name;
  }

  return "Unknown Prakalpa";
}

function getLocationName(report: Report) {
  if (
    typeof report.locationId === "object" &&
    report.locationId &&
    "name" in report.locationId
  ) {
    return (report.locationId as Location).name;
  }

  return "No location";
}

function getAuditorName(report: Report) {
  if (
    typeof report.scheduledAuditId === "object" &&
    report.scheduledAuditId &&
    "finalizedAuditor" in report.scheduledAuditId
  ) {
    return (report.scheduledAuditId as ScheduledAudit).finalizedAuditor || "No auditor";
  }

  return "No auditor";
}

function getDaysOpen(report: Report) {
  if (report.status === "closed") return 0;

  const startDate = new Date(
    report.internalAuditDate || report.createdAt || new Date().toISOString()
  );

  if (Number.isNaN(startDate.getTime())) return 0;

  const diff = Date.now() - startDate.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function isOverdue(report: Report) {
  if (report.status === "closed") return false;

  if (report.dueDate) {
    const dueDate = new Date(report.dueDate);
    return !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
  }

  return report.classification === "NC" && getDaysOpen(report) > 30;
}

function classificationLabel(report: Report) {
  return report.classification === "NC"
    ? "Non-Conformance"
    : "Open for Improvement";
}

interface ActionModalProps {
  report: Report;
  onClose: () => void;
  onSaved: () => void;
}

function ActionModal({ report, onClose, onSaved }: ActionModalProps) {
  const [action, setAction] = useState(report.actionTakenByManager || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSave() {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await updateReport(report._id, {
        actionTakenByManager: action
      });

      await onSaved();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to save action"
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
          <h3 className="font-headline-sm">Add Action Taken</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">
            {getReportId(report)}
          </p>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {getPrakalpaName(report)}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 font-body-md">
              {errorMessage}
            </div>
          )}

          <div className="bg-surface-container-lowest rounded-lg p-4 space-y-2">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider">
              Audit Findings
            </p>
            <p className="font-body-md text-on-surface">
              {report.auditFindings || "-"}
            </p>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Action Taken by Manager
            </label>
            <textarea
              value={action}
              onChange={(event) => setAction(event.target.value)}
              rows={4}
              placeholder="Describe the corrective action taken..."
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
            disabled={!action.trim() || isSubmitting}
            onClick={handleSave}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold disabled:opacity-40"
          >
            {isSubmitting ? "Saving..." : "Save Action"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditReportModalProps {
  report: Report;
  onClose: () => void;
  onSaved: () => void;
  canEditStatus: boolean;
}

function EditReportModal({
  report,
  onClose,
  onSaved,
  canEditStatus
}: EditReportModalProps) {
  const [form, setForm] = useState<UpdateReportPayload>({
    internalAuditDate: inputDate(report.internalAuditDate),
    timeVisited: report.timeVisited || "",
    auditArea: report.auditArea || "",
    auditFindings: report.auditFindings || "",
    classification: report.classification || "NC",
    status: report.status || "open",
    correctiveAction: report.correctiveAction || "",
    dueDate: inputDate(report.dueDate),
    dateClosed: inputDate(report.dateClosed)
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function setField<K extends keyof UpdateReportPayload>(
    key: K,
    value: UpdateReportPayload[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  async function handleSave() {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const payload: UpdateReportPayload = {
        ...form,
        dateClosed:
          form.status === "closed"
            ? form.dateClosed || new Date().toISOString().split("T")[0]
            : undefined
      };

      await updateReport(report._id, payload);

      await onSaved();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update report"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Edit Report</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">
            {getReportId(report)}
          </p>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {getPrakalpaName(report)} — {getAuditorName(report)}
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
                Visit Date
              </label>
              <input
                type="date"
                value={form.internalAuditDate || ""}
                onChange={(event) =>
                  setField("internalAuditDate", event.target.value)
                }
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Visit Time
              </label>
              <input
                type="time"
                value={form.timeVisited || ""}
                onChange={(event) => setField("timeVisited", event.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Audit Area
            </label>
            <input
              value={form.auditArea || ""}
              onChange={(event) => setField("auditArea", event.target.value)}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">
              Classification
            </label>
            <div className="flex gap-3">
              {(["OFI", "NC"] as const).map((classification) => (
                <button
                  key={classification}
                  type="button"
                  onClick={() => setField("classification", classification)}
                  className={`flex-1 py-2.5 rounded-lg font-label-md font-bold border-2 transition-all ${
                    form.classification === classification
                      ? classification === "NC"
                        ? "bg-error/10 border-error text-error"
                        : "bg-primary/10 border-primary text-primary"
                      : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                  }`}
                >
                  {classification === "NC"
                    ? "Non-Conformance"
                    : "Open for Improvement"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Audit Findings
            </label>
            <textarea
              value={form.auditFindings || ""}
              onChange={(event) =>
                setField("auditFindings", event.target.value)
              }
              rows={4}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Corrective Action
            </label>
            <textarea
              value={form.correctiveAction || ""}
              onChange={(event) =>
                setField("correctiveAction", event.target.value)
              }
              rows={3}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={form.dueDate || ""}
              onChange={(event) => setField("dueDate", event.target.value)}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {canEditStatus && (
            <div>
              <label className="font-label-md text-on-surface-variant block mb-2">
                Status
              </label>
              <div className="flex gap-3">
                {(["open", "closed"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setField("status", status)}
                    className={`flex-1 py-2.5 rounded-lg font-label-md font-bold border-2 transition-all capitalize ${
                      form.status === status
                        ? status === "closed"
                          ? "bg-secondary/10 border-secondary text-secondary"
                          : "bg-primary/10 border-primary text-primary"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
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
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DetailModalProps {
  report: Report;
  onClose: () => void;
}

function DetailModal({ report, onClose }: DetailModalProps) {
  const days = getDaysOpen(report);
  const flagged = isOverdue(report);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-2xl z-10 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div
          className={`p-6 border-b ${
            flagged ? "bg-error/5 border-error/20" : "border-outline-variant/10"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="font-data-mono text-[13px] text-primary font-black">
                  {getReportId(report)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    report.status === "open"
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary/10 text-secondary"
                  }`}
                >
                  {report.status || "open"}
                </span>
                {flagged && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error/10 text-error">
                    🚨 Overdue
                  </span>
                )}
              </div>

              <p className="font-label-md text-on-surface-variant">
                IQA Ref:{" "}
                <span className="text-on-surface font-bold">
                  {getAuditRef(report)}
                </span>
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-1 hover:bg-surface-container rounded-full transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Prakalpa", value: getPrakalpaName(report) },
              { label: "Location", value: getLocationName(report) },
              { label: "Auditor", value: getAuditorName(report) },
              { label: "Visit Date", value: formatDate(report.internalAuditDate) },
              { label: "Visit Time", value: report.timeVisited || "-" },
              { label: "Audit Area", value: report.auditArea || "-" },
              { label: "Report Date", value: formatDate(report.createdAt) },
              {
                label: "Days Open",
                value: report.status === "open" ? `${days} days` : "Closed"
              }
            ].map((item) => (
              <div key={item.label}>
                <p className="font-label-md text-on-surface-variant/70">
                  {item.label}
                </p>
                <p className="font-body-md font-semibold text-on-surface mt-0.5">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-1">
              Classification
            </p>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-label-md font-bold ${
                report.classification === "NC"
                  ? "bg-error/10 text-error"
                  : "bg-primary/10 text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {report.classification === "NC" ? "error_outline" : "info"}
              </span>
              {classificationLabel(report)}
            </span>
          </div>

          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-2">
              Audit Findings
            </p>
            <div className="bg-surface-container-lowest rounded-lg p-4 font-body-md text-on-surface leading-relaxed">
              {report.auditFindings || "-"}
            </div>
          </div>

          {report.correctiveAction && (
            <div>
              <p className="font-label-md text-on-surface-variant/70 mb-2">
                Corrective Action
              </p>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 font-body-md text-on-surface leading-relaxed">
                {report.correctiveAction}
              </div>
            </div>
          )}

          {report.actionTakenByManager && (
            <div>
              <p className="font-label-md text-on-surface-variant/70 mb-2">
                Action Taken by Manager
              </p>
              <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4 font-body-md text-on-surface leading-relaxed">
                {report.actionTakenByManager}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AllReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [actionTarget, setActionTarget] = useState<Report | null>(null);
  const [editTarget, setEditTarget] = useState<Report | null>(null);
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterClassification, setFilterClassification] = useState("All");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const savedUser = getSavedUser();
  const isChief = savedUser?.role === "chief_auditor";
  const isAuditor = savedUser?.role === "auditor";
  const isManager = savedUser?.role === "prakalpa_manager";

  async function loadReports() {
    try {
      setPageError("");
      const data = await getReports();
      setReports(data);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  const prakalpaOptions = useMemo(() => {
    return Array.from(new Set(reports.map((report) => getPrakalpaName(report))))
      .filter((name) => name && name !== "Unknown Prakalpa");
  }, [reports]);

  const auditorOptions = useMemo(() => {
    return Array.from(new Set(reports.map((report) => getAuditorName(report))))
      .filter((name) => name && name !== "No auditor");
  }, [reports]);

  const overdueReports = reports.filter(isOverdue);

  const filtered = useMemo(() => {
    return reports.filter((report) => {
      const prakalpaName = getPrakalpaName(report);
      const auditorName = getAuditorName(report);
      const searchText = [
        getReportId(report),
        getAuditRef(report),
        prakalpaName,
        getLocationName(report),
        auditorName,
        report.auditArea,
        report.auditFindings,
        report.classification,
        report.status
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
        filterAuditor === "All" || auditorName === filterAuditor;

      const matchStatus =
        filterStatus === "All" || report.status === filterStatus.toLowerCase();

      const matchClassification =
        filterClassification === "All" ||
        report.classification === filterClassification;

      return (
        matchSearch &&
        matchPrakalpa &&
        matchAuditor &&
        matchStatus &&
        matchClassification
      );
    });
  }, [
    reports,
    search,
    filterPrakalpa,
    filterAuditor,
    filterStatus,
    filterClassification
  ]);

  const canEditReport = isChief || isAuditor;
  const canAddAction = isChief || isManager;
  const canCloseReport = isChief;

  async function handleCloseReport(report: Report) {
    await updateReport(report._id, {
      status: "closed",
      dateClosed: new Date().toISOString().split("T")[0]
    });

    await loadReports();
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-8">
          <p className="font-body-md text-on-surface-variant">
            Loading reports...
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          <p className="font-label-md font-bold">Reports failed to load</p>
          <p className="font-body-md mt-1">{pageError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">All Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} backend reports from MongoDB
          </p>
        </div>
      </div>

      {overdueReports.length > 0 && (
        <div className="bg-error/5 border border-error/30 rounded-xl p-4 flex items-center gap-4">
          <span className="material-symbols-outlined text-error text-[24px]">
            flag
          </span>
          <div>
            <p className="font-label-md font-bold text-error">
              {overdueReports.length} open reports are overdue
            </p>
            <p className="font-label-md text-error/70">
              These require follow-up action.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search IQR/IQA number, Prakalpa, finding..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest"
          />
        </div>

        <select
          value={filterPrakalpa}
          onChange={(event) => setFilterPrakalpa(event.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Prakalpa</option>
          {prakalpaOptions.map((prakalpa) => (
            <option key={prakalpa}>{prakalpa}</option>
          ))}
        </select>

        <select
          value={filterAuditor}
          onChange={(event) => setFilterAuditor(event.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Auditors</option>
          {auditorOptions.map((auditor) => (
            <option key={auditor}>{auditor}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(event) => setFilterStatus(event.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Status</option>
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          value={filterClassification}
          onChange={(event) => setFilterClassification(event.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Classification</option>
          <option value="NC">Non-Conformance</option>
          <option value="OFI">Open for Improvement</option>
        </select>

        {(search ||
          filterPrakalpa !== "All" ||
          filterAuditor !== "All" ||
          filterStatus !== "All" ||
          filterClassification !== "All") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterPrakalpa("All");
              setFilterAuditor("All");
              setFilterStatus("All");
              setFilterClassification("All");
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
            fact_check
          </span>
          <p className="font-headline-sm text-on-surface-variant/40">
            No reports found
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0">
                <tr>
                  {[
                    "IQR Number",
                    "IQA Ref",
                    "Prakalpa",
                    "Location",
                    "Auditor",
                    "Visit Date",
                    "Classification",
                    "Days Open",
                    "Status",
                    "Actions"
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((report, index) => {
                  const days = getDaysOpen(report);
                  const flagged = isOverdue(report);

                  return (
                    <tr
                      key={report._id}
                      onClick={() => setDetailTarget(report)}
                      className={`transition-colors cursor-pointer ${
                        flagged
                          ? "bg-error/5 hover:bg-error/10"
                          : index % 2 === 1
                            ? "bg-surface-container-lowest/50 hover:bg-surface-container-low"
                            : "hover:bg-surface-container-low"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {flagged && (
                            <span className="material-symbols-outlined text-error text-[16px]">
                              flag
                            </span>
                          )}
                          <span className="font-data-mono text-[12px] text-primary font-bold">
                            {getReportId(report)}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 font-data-mono text-[12px] text-on-surface-variant">
                        {getAuditRef(report)}
                      </td>

                      <td className="px-4 py-4 font-body-md font-medium text-on-surface">
                        {getPrakalpaName(report)}
                      </td>

                      <td className="px-4 py-4 font-body-md text-on-surface-variant">
                        {getLocationName(report)}
                      </td>

                      <td className="px-4 py-4 font-body-md text-on-surface">
                        {getAuditorName(report)}
                      </td>

                      <td className="px-4 py-4 font-data-mono text-[12px]">
                        {formatDate(report.internalAuditDate)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            report.classification === "NC"
                              ? "bg-error/10 text-error"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {classificationLabel(report)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`font-data-mono font-bold text-[12px] ${
                            flagged
                              ? "text-error"
                              : days > 15
                                ? "text-primary"
                                : "text-on-surface-variant"
                          }`}
                        >
                          {report.status === "closed" ? "—" : `${days}d`}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            report.status === "closed"
                              ? "bg-secondary/10 text-secondary"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {report.status || "open"}
                        </span>
                      </td>

                      <td
                        className="px-4 py-4"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          {canEditReport && (
                            <button
                              onClick={() => setEditTarget(report)}
                              title="Edit"
                              className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                edit
                              </span>
                            </button>
                          )}

                          {canAddAction && (
                            <button
                              onClick={() => setActionTarget(report)}
                              title="Add action"
                              className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                assignment_turned_in
                              </span>
                            </button>
                          )}

                          {canCloseReport && report.status === "open" && (
                            <button
                              onClick={() => handleCloseReport(report)}
                              title="Close report"
                              className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                task_alt
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actionTarget && (
        <ActionModal
          report={actionTarget}
          onClose={() => setActionTarget(null)}
          onSaved={loadReports}
        />
      )}

      {editTarget && (
        <EditReportModal
          report={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={loadReports}
          canEditStatus={isChief}
        />
      )}

      {detailTarget && (
        <DetailModal
          report={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </div>
  );
}