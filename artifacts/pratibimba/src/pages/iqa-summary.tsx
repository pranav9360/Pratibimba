import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type MouseEvent as ReactMouseEvent
} from "react";
import {
  getReports,
  getScheduledAudits,
  type AuditPlan,
  type Location,
  type Prakalpa,
  type Report,
  type ScheduledAudit
} from "../lib/api";

type SummaryRow = {
  audit: ScheduledAudit;
  reports: Report[];
};

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

function csvValue(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
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

function getPrakalpaNameFromAudit(audit: ScheduledAudit) {
  if (
    typeof audit.prakalpaId === "object" &&
    audit.prakalpaId &&
    "name" in audit.prakalpaId
  ) {
    return (audit.prakalpaId as Prakalpa).name;
  }

  return "Unknown Prakalpa";
}

function getLocationNameFromAudit(audit: ScheduledAudit) {
  if (
    typeof audit.locationId === "object" &&
    audit.locationId &&
    "name" in audit.locationId
  ) {
    return (audit.locationId as Location).name;
  }

  return "No location";
}

function getPrakalpaNameFromReport(report: Report) {
  if (
    typeof report.prakalpaId === "object" &&
    report.prakalpaId &&
    "name" in report.prakalpaId
  ) {
    return (report.prakalpaId as Prakalpa).name;
  }

  return "Unknown Prakalpa";
}

function getLocationNameFromReport(report: Report) {
  if (
    typeof report.locationId === "object" &&
    report.locationId &&
    "name" in report.locationId
  ) {
    return (report.locationId as Location).name;
  }

  return "No location";
}

function getAuditorName(audit: ScheduledAudit) {
  return audit.finalizedAuditor || "No auditor";
}

function getReportScheduledAuditId(report: Report) {
  if (
    typeof report.scheduledAuditId === "object" &&
    report.scheduledAuditId &&
    "_id" in report.scheduledAuditId
  ) {
    return (report.scheduledAuditId as ScheduledAudit)._id;
  }

  if (typeof report.scheduledAuditId === "string") {
    return report.scheduledAuditId;
  }

  return "";
}

function getDaysOpen(report: Report) {
  if (report.status === "closed") return 0;

  const startDate = new Date(
    report.internalAuditDate || report.createdAt || new Date().toISOString()
  );

  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }

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

function getClassificationLabel(report: Report) {
  return report.classification === "NC"
    ? "Non-Conformance"
    : "Open for Improvement";
}

function getAuditStatus(reports: Report[]) {
  if (reports.length === 0) {
    return {
      key: "no-reports",
      label: "No Reports",
      style: "bg-surface-container text-on-surface-variant"
    };
  }

  if (reports.every((report) => report.status === "closed")) {
    return {
      key: "closed",
      label: "All Closed",
      style: "bg-secondary/10 text-secondary"
    };
  }

  const hasOpenNC = reports.some(
    (report) => report.classification === "NC" && report.status === "open"
  );

  if (hasOpenNC) {
    return {
      key: "open",
      label: "NC Open",
      style: "bg-error/10 text-error"
    };
  }

  return {
    key: "open",
    label: "Open",
    style: "bg-primary/10 text-primary"
  };
}

function matchReportsToAudit(audit: ScheduledAudit, reports: Report[]) {
  const auditId = getAuditId(audit);

  return reports.filter((report) => {
    const reportScheduledAuditId = getReportScheduledAuditId(report);

    return (
      reportScheduledAuditId === audit._id ||
      report.auditId === auditId
    );
  });
}

function downloadCSV(filename: string, rows: string[]) {
  const csv = rows.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

interface FullDetailModalProps {
  row: SummaryRow;
  onClose: () => void;
}

function FullDetailModal({ row, onClose }: FullDetailModalProps) {
  const { audit, reports } = row;

  const openReports = reports.filter((report) => report.status === "open");
  const closedReports = reports.filter((report) => report.status === "closed");
  const ncReports = reports.filter((report) => report.classification === "NC");
  const ofiReports = reports.filter((report) => report.classification === "OFI");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-3xl z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 bg-surface-container-lowest flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-data-mono text-[13px] text-primary font-black">
                {getAuditId(audit)}
              </span>
            </div>

            <h3 className="font-headline-sm text-on-surface">
              {getPrakalpaNameFromAudit(audit)}
            </h3>

            <p className="font-body-md text-on-surface-variant mt-0.5">
              {audit.auditPurpose || "No purpose added"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 hover:bg-surface-container rounded-full transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Final Auditor", value: getAuditorName(audit) },
              {
                label: "Audit Period",
                value: `${formatDate(audit.auditStartDate)} – ${formatDate(
                  audit.auditEndDate
                )}`
              },
              { label: "Location", value: getLocationNameFromAudit(audit) },
              { label: "Coordinator", value: audit.auditCoordinator || "-" },
              { label: "Total Reports", value: reports.length },
              { label: "Open Reports", value: openReports.length },
              { label: "NC Reports", value: ncReports.length },
              { label: "OFI Reports", value: ofiReports.length }
            ].map((item) => (
              <div
                key={item.label}
                className="bg-surface-container-lowest rounded-lg p-3"
              >
                <p className="font-label-md text-on-surface-variant/70">
                  {item.label}
                </p>
                <p className="font-body-md font-bold text-on-surface mt-0.5">
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {reports.length === 0 ? (
            <div className="text-center py-8 text-on-surface-variant/50 font-body-md">
              No reports for this audit yet.
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-headline-sm text-on-surface">Reports</h4>

              {reports.map((report) => {
                const days = getDaysOpen(report);
                const overdue = isOverdue(report);

                return (
                  <div
                    key={report._id}
                    className={`rounded-xl border p-5 space-y-4 ${
                      overdue
                        ? "border-error/30 bg-error/5"
                        : "border-outline-variant/20"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-data-mono text-[12px] text-primary font-bold">
                            {report.reportId}
                          </span>

                          {overdue && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error">
                              🚨 Overdue
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 font-label-md text-on-surface-variant">
                          <span>
                            Visit: {formatDate(report.internalAuditDate)} at{" "}
                            {report.timeVisited || "-"}
                          </span>
                          <span>·</span>
                          <span>Report Date: {formatDate(report.createdAt)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            report.classification === "NC"
                              ? "bg-error/10 text-error"
                              : "bg-primary/10 text-primary"
                          }`}
                        >
                          {getClassificationLabel(report)}
                        </span>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                            report.status === "open"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary/10 text-secondary"
                          }`}
                        >
                          {report.status || "open"}
                        </span>

                        {report.status === "open" && (
                          <span
                            className={`font-data-mono font-bold text-[11px] ${
                              overdue ? "text-error" : "text-on-surface-variant"
                            }`}
                          >
                            {days}d open
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="font-label-md text-on-surface-variant/70 mb-1">
                        Findings
                      </p>
                      <p className="font-body-md text-on-surface">
                        {report.auditFindings || "-"}
                      </p>
                    </div>

                    {report.actionTakenByManager && (
                      <div>
                        <p className="font-label-md text-on-surface-variant/70 mb-1">
                          Action Taken
                        </p>
                        <p className="font-body-md text-on-surface bg-secondary/5 rounded-lg p-3">
                          {report.actionTakenByManager}
                        </p>
                      </div>
                    )}

                    {(report.proofUrl || report.checklistUrl) && (
                      <div className="flex flex-wrap gap-2">
                        {report.proofUrl && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-container rounded-lg font-label-md text-on-surface-variant">
                            <span className="material-symbols-outlined text-[14px]">
                              attach_file
                            </span>
                            {report.proofUrl}
                          </span>
                        )}

                        {report.checklistUrl && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-secondary/5 rounded-lg font-label-md text-secondary">
                            <span className="material-symbols-outlined text-[14px]">
                              checklist
                            </span>
                            Checklist
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {closedReports.length > 0 && (
            <p className="font-label-md text-on-surface-variant/60">
              Closed reports in this audit: {closedReports.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IQASummaryPage() {
  const [scheduledAudits, setScheduledAudits] = useState<ScheduledAudit[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [doubleClickTarget, setDoubleClickTarget] = useState<SummaryRow | null>(
    null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [lastClickTime] = useState(() => new Map<string, number>());

  async function loadSummaryData() {
    try {
      setPageError("");

      const [scheduledAuditData, reportData] = await Promise.all([
        getScheduledAudits(),
        getReports()
      ]);

      setScheduledAudits(scheduledAuditData);
      setReports(reportData);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load IQA summary"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSummaryData();
  }, []);

  const summaryRows: SummaryRow[] = useMemo(() => {
    return scheduledAudits.map((audit) => ({
      audit,
      reports: matchReportsToAudit(audit, reports)
    }));
  }, [scheduledAudits, reports]);

  const prakalpaOptions = useMemo(() => {
    return Array.from(
      new Set(summaryRows.map((row) => getPrakalpaNameFromAudit(row.audit)))
    ).filter((name) => name && name !== "Unknown Prakalpa");
  }, [summaryRows]);

  const auditorOptions = useMemo(() => {
    return Array.from(
      new Set(summaryRows.map((row) => getAuditorName(row.audit)))
    ).filter((name) => name && name !== "No auditor");
  }, [summaryRows]);

  const filtered = useMemo(() => {
    return summaryRows.filter(({ audit, reports: auditReports }) => {
      const auditId = getAuditId(audit);
      const prakalpaName = getPrakalpaNameFromAudit(audit);
      const auditorName = getAuditorName(audit);
      const status = getAuditStatus(auditReports);

      const searchText = [
        auditId,
        prakalpaName,
        getLocationNameFromAudit(audit),
        auditorName,
        audit.auditPurpose,
        audit.auditCoordinator,
        status.label
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
        filterStatus === "All" || filterStatus.toLowerCase() === status.key;

      return matchSearch && matchPrakalpa && matchAuditor && matchStatus;
    });
  }, [
    summaryRows,
    search,
    filterPrakalpa,
    filterAuditor,
    filterStatus
  ]);

  const exportRows =
    selected.size > 0
      ? filtered.filter((row) => selected.has(row.audit._id))
      : filtered;

  const totalReports = reports.length;
  const totalOpenReports = reports.filter((report) => report.status === "open").length;
  const totalNCReports = reports.filter((report) => report.classification === "NC").length;
  const totalOverdueReports = reports.filter(isOverdue).length;

  function handleRowClick(row: SummaryRow) {
    const now = Date.now();
    const last = lastClickTime.get(row.audit._id) || 0;

    lastClickTime.set(row.audit._id, now);

    if (now - last < 400) {
      setDoubleClickTarget(row);
      setExpandedId(null);
    } else {
      setExpandedId((current) =>
        current === row.audit._id ? null : row.audit._id
      );
    }
  }

  function toggleSelect(id: string, event: ReactMouseEvent) {
    event.stopPropagation();

    setSelected((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  function selectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
      return;
    }

    setSelected(new Set(filtered.map((row) => row.audit._id)));
  }

  function exportToCSV(rows: SummaryRow[], summaryOnly: boolean) {
    const lines: string[] = [];

    if (summaryOnly) {
      lines.push(
        [
          "Audit ID",
          "Prakalpa",
          "Location",
          "Auditor",
          "Start Date",
          "End Date",
          "Total Reports",
          "Open Reports",
          "NC Reports",
          "OFI Reports",
          "Overdue Reports"
        ].map(csvValue).join(",")
      );

      rows.forEach(({ audit, reports: auditReports }) => {
        lines.push(
          [
            getAuditId(audit),
            getPrakalpaNameFromAudit(audit),
            getLocationNameFromAudit(audit),
            getAuditorName(audit),
            audit.auditStartDate || "",
            audit.auditEndDate || "",
            auditReports.length,
            auditReports.filter((report) => report.status === "open").length,
            auditReports.filter((report) => report.classification === "NC").length,
            auditReports.filter((report) => report.classification === "OFI").length,
            auditReports.filter(isOverdue).length
          ].map(csvValue).join(",")
        );
      });
    } else {
      lines.push(
        [
          "Audit ID",
          "Report ID",
          "Prakalpa",
          "Location",
          "Auditor",
          "Visit Date",
          "Visit Time",
          "Classification",
          "Findings",
          "Status",
          "Days Open",
          "Action Taken"
        ].map(csvValue).join(",")
      );

      rows.forEach(({ audit, reports: auditReports }) => {
        if (auditReports.length === 0) {
          lines.push(
            [
              getAuditId(audit),
              "",
              getPrakalpaNameFromAudit(audit),
              getLocationNameFromAudit(audit),
              getAuditorName(audit),
              "",
              "",
              "",
              "",
              "",
              "",
              ""
            ].map(csvValue).join(",")
          );
          return;
        }

        auditReports.forEach((report) => {
          lines.push(
            [
              getAuditId(audit),
              report.reportId,
              getPrakalpaNameFromReport(report),
              getLocationNameFromReport(report),
              getAuditorName(audit),
              report.internalAuditDate || "",
              report.timeVisited || "",
              getClassificationLabel(report),
              report.auditFindings || "",
              report.status || "open",
              report.status === "open" ? getDaysOpen(report) : 0,
              report.actionTakenByManager || ""
            ].map(csvValue).join(",")
          );
        });
      });
    }

    downloadCSV(
      `IQA_${summaryOnly ? "Summary" : "Detail"}_${
        new Date().toISOString().split("T")[0]
      }.csv`,
      lines
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-8">
          <p className="font-body-md text-on-surface-variant">
            Loading IQA summary...
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          <p className="font-label-md font-bold">IQA Summary failed to load</p>
          <p className="font-body-md mt-1">{pageError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">IQA Summary</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {scheduledAudits.length} scheduled audits · {totalReports} reports ·{" "}
            {totalOpenReports} open · {totalNCReports} NC ·{" "}
            {totalOverdueReports} overdue
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => exportToCSV(exportRows, true)}
            className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              table_chart
            </span>
            {selected.size > 0
              ? `Export Summary (${selected.size})`
              : "Export Summary"}
          </button>

          <button
            onClick={() => exportToCSV(exportRows, false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-label-md font-bold hover:brightness-110 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            {selected.size > 0
              ? `Export Detail (${selected.size})`
              : "Export All Detail"}
          </button>
        </div>
      </div>

      <p className="font-label-md text-on-surface-variant/60 italic">
        Single click to expand details · Double-click for full report view ·
        Checkbox to select rows for export
      </p>

      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search audit ID, Prakalpa, location, auditor..."
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
          <option value="No-Reports">No Reports</option>
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

      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0">
              <tr>
                <th className="px-4 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      selected.size === filtered.length && filtered.length > 0
                    }
                    onChange={selectAll}
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                  />
                </th>

                {[
                  "Audit ID",
                  "Prakalpa",
                  "Location",
                  "Auditor",
                  "Period",
                  "Reports",
                  "Status",
                  ""
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center font-body-md text-on-surface-variant/50"
                  >
                    No audits found
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const { audit, reports: auditReports } = row;
                  const statusBadge = getAuditStatus(auditReports);
                  const isExpanded = expandedId === audit._id;
                  const isSelected = selected.has(audit._id);
                  const openCount = auditReports.filter(
                    (report) => report.status === "open"
                  ).length;
                  const closedCount = auditReports.filter(
                    (report) => report.status === "closed"
                  ).length;
                  const hasOverdue = auditReports.some(isOverdue);

                  return (
                    <Fragment key={audit._id}>
                      <tr
                        onClick={() => handleRowClick(row)}
                        className={`transition-colors cursor-pointer select-none ${
                          isSelected
                            ? "bg-primary/5"
                            : index % 2 === 1
                              ? "bg-surface-container-lowest/50 hover:bg-surface-container-low"
                              : "hover:bg-surface-container-low"
                        } ${isExpanded ? "border-l-4 border-primary" : ""}`}
                      >
                        <td
                          className="px-4 py-4"
                          onClick={(event) => toggleSelect(audit._id, event)}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                          />
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {hasOverdue && (
                              <span className="material-symbols-outlined text-error text-[14px]">
                                flag
                              </span>
                            )}
                            <span className="font-data-mono text-[12px] text-primary font-bold">
                              {getAuditId(audit)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 font-body-md font-medium text-on-surface">
                          {getPrakalpaNameFromAudit(audit)}
                        </td>

                        <td className="px-4 py-4 font-body-md text-on-surface-variant">
                          {getLocationNameFromAudit(audit)}
                        </td>

                        <td className="px-4 py-4 font-body-md text-on-surface">
                          {getAuditorName(audit)}
                        </td>

                        <td className="px-4 py-4 font-data-mono text-[12px] text-on-surface-variant whitespace-nowrap">
                          {formatDate(audit.auditStartDate)} –{" "}
                          {formatDate(audit.auditEndDate)}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-label-md font-bold text-on-surface">
                              {auditReports.length}
                            </span>

                            {auditReports.length > 0 && (
                              <div className="flex gap-1 font-label-md text-[10px]">
                                {openCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded font-bold">
                                    {openCount} open
                                  </span>
                                )}

                                {closedCount > 0 && (
                                  <span className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded font-bold">
                                    {closedCount} closed
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusBadge.style}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-on-surface-variant/50">
                          <span
                            className="material-symbols-outlined text-[18px] transition-transform"
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "none"
                            }}
                          >
                            expand_more
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr
                          key={`${audit._id}-expanded`}
                          className="bg-surface-container-lowest"
                        >
                          <td
                            colSpan={8}
                            className="px-8 py-4 border-b border-outline-variant/20"
                          >
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-6 font-body-md text-on-surface-variant">
                                <span className="flex gap-2">
                                  <strong className="text-on-surface">
                                    Purpose:
                                  </strong>
                                  {audit.auditPurpose || "-"}
                                </span>

                                <span className="flex gap-2">
                                  <strong className="text-on-surface">
                                    Coordinator:
                                  </strong>
                                  {audit.auditCoordinator || "-"}
                                </span>
                              </div>

                              {auditReports.length === 0 ? (
                                <p className="font-label-md text-on-surface-variant/50 italic">
                                  No reports filed for this audit yet.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {auditReports.map((report) => {
                                    const days = getDaysOpen(report);
                                    const overdue = isOverdue(report);

                                    return (
                                      <div
                                        key={report._id}
                                        className={`flex flex-wrap items-center gap-4 p-3 rounded-lg border ${
                                          overdue
                                            ? "border-error/30 bg-error/5"
                                            : "border-outline-variant/20 bg-white"
                                        }`}
                                      >
                                        <span className="font-data-mono text-[11px] font-bold text-primary">
                                          {report.reportId}
                                        </span>

                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            report.classification === "NC"
                                              ? "bg-error/10 text-error"
                                              : "bg-primary/10 text-primary"
                                          }`}
                                        >
                                          {getClassificationLabel(report)}
                                        </span>

                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            report.status === "open"
                                              ? "bg-primary/10 text-primary"
                                              : "bg-secondary/10 text-secondary"
                                          }`}
                                        >
                                          {report.status || "open"}
                                        </span>

                                        {report.status === "open" && (
                                          <span
                                            className={`font-data-mono text-[11px] font-bold ${
                                              overdue ? "text-error" : ""
                                            }`}
                                          >
                                            {days}d open
                                          </span>
                                        )}

                                        {overdue && (
                                          <span className="text-error font-label-md font-bold">
                                            🚨
                                          </span>
                                        )}

                                        <span className="font-label-md text-on-surface-variant/60 line-clamp-1 flex-1">
                                          {report.auditFindings || "-"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {doubleClickTarget && (
        <FullDetailModal
          row={doubleClickTarget}
          onClose={() => setDoubleClickTarget(null)}
        />
      )}
    </div>
  );
}
