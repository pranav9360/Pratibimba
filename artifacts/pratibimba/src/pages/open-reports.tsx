import { useState, useMemo, useEffect } from "react";
import {
  useApp,
  PRAKALPAS,
  AUDIT_COORDINATORS,
} from "../context/app-context";
import {
  getReports,
  downloadReportPDF,
  closeReport,
} from "../services/reportService";
import SendReportEmailModal from "../components/send-report-email-modal";

interface Report {
  _id: string;
  iqrNumber: string;
  iqaNumber: string;
  prakalpa: string;
  location: string;
  sublocation: string;
  auditCoordinator: string;
  auditors: string[];
  visitDate: string;
  visitTime: string;
  severity: "non_conformance" | "open_for_improvement";
  findings: string;
  proofFiles: string[];
  hasChecklist: boolean;
  createdAt: string;
  prakalphaPramukh?: string;
  auditor?: string;
  status?: string;
  dueDate?: string;
  actionTaken?: string;
  completionRemarks?: string;
  closedBy?: string;
  closedAt?: string;
  mailSent?: boolean;
  mailSentAt?: string;
  mailSentTo?: string[];
}

function downloadCSV(reports: Report[]) {
  const headers = [
    "Report ID (IQR)",
    "IQA Ref",
    "Prakalpa",
    "Location",
    "Sublocation",
    "Visit Date",
    "Auditor(s)",
    "Findings",
    "Classification",
    "Coordinator",
    "Status",
  ];
  const rows = reports.map((r) => [
    r.iqrNumber || "",
    r.iqaNumber || "",
    r.prakalpa || "",
    r.location || "",
    r.sublocation || "",
    r.visitDate || "",
    (r.auditors || [r.auditor || ""]).join("; "),
    `"${(r.findings || "").replace(/"/g, '""')}"`,
    r.severity === "non_conformance" ? "NC" : "OFI",
    r.auditCoordinator || "",
    r.status || "open",
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `OpenReports_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OpenReportsPage() {
  const { currentUser } = useApp();
  const [reports, setReports] = useState<Report[]>([]);
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);
  const [mailTarget, setMailTarget] = useState<Report | null>(null);

  // Close Report Form State
  const [closeTarget, setCloseTarget] = useState<Report | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [closing, setClosing] = useState(false);

  // In-App Success Modal State
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastClosedNumber, setLastClosedNumber] = useState<string>("");

  const [filterReportId, setFilterReportId] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterClassification, setFilterClassification] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await getReports();
      console.log("Open reports loaded:", data);
      setReports(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error("Error loading open reports:", err);
    }
  };

  const handleViewReport = (report: Report) => {
    setDetailTarget(report);
  };

  const handleDownload = async (report: Report) => {
    try {
      await downloadReportPDF(report._id);
    } catch (error) {
      console.error("Error downloading report PDF:", error);
    }
  };

  const handleOpenCloseDialog = (report: Report) => {
    setCloseTarget(report);
    setActionTaken("");
    setCompletionRemarks("");
  };

  const handleConfirmCloseReport = async () => {
    if (!closeTarget || !actionTaken.trim()) return;

    setClosing(true);
    const iqrNum = closeTarget.iqrNumber;

    try {
      await closeReport(closeTarget._id, {
        actionTaken: actionTaken.trim(),
        completionRemarks: completionRemarks.trim(),
        closedBy: currentUser.name || "User",
        closedAt: new Date().toISOString(),
      });

      setLastClosedNumber(iqrNum);
      setCloseTarget(null);
      setDetailTarget(null);
      setActionTaken("");
      setCompletionRemarks("");

      await loadReports();

      setSuccessOpen(true);
    } catch (error) {
      console.error("Error closing report:", error);
      alert("Unable to close report. Please try again.");
    } finally {
      setClosing(false);
    }
  };

  const isAuditor = currentUser.role === "auditor";
  const isManager = currentUser.role === "prakalpa_manager";

  // Filter for reports that are open (or missing status field)
  const openReports = useMemo(() => {
    return reports.filter(
      (r) => !r.status || r.status.toLowerCase() === "open"
    );
  }, [reports]);

  const filtered = useMemo(() => {
    return openReports.filter((r) => {
      if (r.status && r.status.toLowerCase() !== "open") {
        return false;
      }

      const q = search.toLowerCase();

      const ms =
        !q ||
        (r.iqrNumber || "").toLowerCase().includes(q) ||
        (r.iqaNumber || "").toLowerCase().includes(q) ||
        (r.prakalpa || "").toLowerCase().includes(q) ||
        (r.findings || "").toLowerCase().includes(q);

      const matchReportId =
        !filterReportId ||
        (r.iqrNumber || "")
          .toLowerCase()
          .includes(filterReportId.toLowerCase());

      const matchPrakalpa =
        filterPrakalpa === "All" || r.prakalpa === filterPrakalpa;

      const matchClass =
        filterClassification === "All" ||
        (filterClassification === "NC"
          ? r.severity === "non_conformance"
          : r.severity === "open_for_improvement");

      const matchCoord =
        filterCoordinator === "All" ||
        r.auditCoordinator === filterCoordinator;

      const matchUser = isManager
        ? r.prakalpa === currentUser.prakalpa
        : isAuditor
        ? (r.auditors || []).includes(currentUser.name || "") ||
          r.auditor === currentUser.name
        : true;

      return (
        ms &&
        matchReportId &&
        matchPrakalpa &&
        matchClass &&
        matchCoord &&
        matchUser
      );
    });
  }, [
    openReports,
    search,
    filterReportId,
    filterPrakalpa,
    filterClassification,
    filterCoordinator,
    isManager,
    isAuditor,
    currentUser,
  ]);

  const clearFilters = () => {
    setSearch("");
    setFilterReportId("");
    setFilterPrakalpa("All");
    setFilterClassification("All");
    setFilterStatus("All");
    setFilterCoordinator("All");
  };

  const ncCount = useMemo(
    () => filtered.filter((r) => r.severity === "non_conformance").length,
    [filtered]
  );

  const ofiCount = useMemo(
    () => filtered.filter((r) => r.severity === "open_for_improvement").length,
    [filtered]
  );

  const redFlaggedCount = useMemo(() => {
    return filtered.filter((r) => {
      const days = Math.floor(
        (Date.now() - new Date(r.createdAt).getTime()) / 86400000
      );
      return days > 30;
    }).length;
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Open Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} active reports
            {isManager ? ` — ${currentUser.prakalpa}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={loadReports}
            className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              refresh
            </span>
            Refresh
          </button>
          <button
            onClick={() => downloadCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              download
            </span>
            Download
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            Open Reports
          </p>
          <p className="text-3xl font-bold text-primary mt-2 font-data-mono">
            {filtered.length}
          </p>
        </div>

        <div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            High Priority
          </p>
          <p className="text-3xl font-bold text-error mt-2 font-data-mono">
            {redFlaggedCount}
          </p>
        </div>

        <div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            NC Reports
          </p>
          <p className="text-3xl font-bold text-error mt-2 font-data-mono">
            {ncCount}
          </p>
        </div>

        <div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            OFI Reports
          </p>
          <p className="text-3xl font-bold text-primary mt-2 font-data-mono">
            {ofiCount}
          </p>
        </div>
      </div>

      {/* Warning Banner for >30d open reports */}
      {redFlaggedCount > 0 && (
        <div className="bg-error/5 border border-error/30 rounded-xl p-4 flex gap-4 items-center">
          <span className="material-symbols-outlined text-error text-[24px]">
            flag
          </span>
          <div>
            <p className="font-bold text-error font-label-md">
              {redFlaggedCount} report(s) have remained open for more than 30 days.
            </p>
            <p className="text-error/70 font-label-md text-sm">
              Immediate corrective action is recommended.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[180px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search open reports..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest"
          />
        </div>
        <input
          type="text"
          placeholder="Report ID (IQR)"
          value={filterReportId}
          onChange={(e) => setFilterReportId(e.target.value)}
          className="w-full sm:w-36 border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        />
        {!isManager && (
          <select
            value={filterPrakalpa}
            onChange={(e) => setFilterPrakalpa(e.target.value)}
            className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          >
            <option value="All">All Prakalpas</option>
            {PRAKALPAS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        )}
        <select
          value={filterClassification}
          onChange={(e) => setFilterClassification(e.target.value)}
          className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Types</option>
          <option value="NC">NC</option>
          <option value="OFI">OFI</option>
        </select>
        <select
          value={filterCoordinator}
          onChange={(e) => setFilterCoordinator(e.target.value)}
          className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
        >
          <option value="All">All Coordinators</option>
          {AUDIT_COORDINATORS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {(search ||
          filterReportId ||
          filterPrakalpa !== "All" ||
          filterClassification !== "All" ||
          filterStatus !== "All" ||
          filterCoordinator !== "All") && (
          <button
            onClick={clearFilters}
            className="font-label-md text-on-surface-variant/60 hover:text-primary"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-[48px] text-secondary/40">
            check_circle
          </span>
          <p className="font-headline-sm text-on-surface-variant/40">
            No open reports found
          </p>
          <p className="font-body-md text-on-surface-variant/30">All clear!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px]">
            <table className="w-full min-w-[1100px] text-left">
              <thead className="sticky top-0 z-10 bg-white shadow-sm border-b border-outline-variant/20">
                <tr>
                  {[
                    "Report ID",
                    "IQA Ref",
                    "Prakalpa",
                    "Location",
                    "Auditor",
                    "Audit Date",
                    "Finding",
                    "NC",
                    "OFI",
                    "Status",
                    "Days Open",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[11px]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((report, idx) => {
                  const days = Math.floor(
                    (Date.now() - new Date(report.createdAt).getTime()) /
                      86400000
                  );

                  const ncObs = report.severity === "non_conformance" ? 1 : 0;
                  const ofiObs =
                    report.severity === "open_for_improvement" ? 1 : 0;

                  const assignedAuditors =
                    report.auditors && report.auditors.length > 0
                      ? report.auditors.join(", ")
                      : report.auditor || "—";

                  return (
                    <tr
                      key={report._id || idx}
                      className={`
                        transition-all
                        duration-200
                        cursor-pointer
                        hover:bg-surface-container-low
                        hover:shadow-md
                        ${
                          days > 30
                            ? "bg-error/5"
                            : idx % 2 === 1
                            ? "bg-surface-container-lowest/50"
                            : ""
                        }
                      `}
                      onClick={() => handleViewReport(report)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {days > 30 && (
                            <span
                              className="material-symbols-outlined text-error text-[16px]"
                              title="Open for more than 30 days"
                            >
                              flag
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReport(report);
                            }}
                            className="font-data-mono text-primary font-bold text-[12px] hover:underline text-left"
                          >
                            {report.iqrNumber}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-data-mono text-[11px] text-on-surface-variant">
                        {report.iqaNumber || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px] tracking-wide whitespace-nowrap">
                          {report.prakalpa}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant text-[12px] whitespace-nowrap">
                        {report.location || "—"}
                      </td>
                      <td className="px-4 py-3 font-body-md text-on-surface-variant text-[12px] whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[17px] text-secondary">
                            badge
                          </span>
                          <span>{assignedAuditors}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-data-mono text-[11px] whitespace-nowrap">
                        {report.visitDate
                          ? new Date(report.visitDate).toLocaleDateString(
                              "en-IN",
                              { day: "2-digit", month: "short", year: "numeric" }
                            )
                          : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <p className="font-body-md text-[12px] text-on-surface truncate">
                          {report.findings}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center font-data-mono font-bold text-[13px]">
                        {ncObs > 0 ? (
                          <span className="px-2 py-1 rounded-full bg-error/10 text-error font-bold text-[10px]">
                            NC
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center font-data-mono font-bold text-[13px]">
                        {ofiObs > 0 ? (
                          <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                            OFI
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            (report.status ?? "open") === "open"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary/10 text-secondary"
                          }`}
                        >
                          {report.status ?? "open"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-data-mono text-[12px] ${
                            days > 30
                              ? "text-error font-bold"
                              : days > 14
                              ? "text-error/60"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {days}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Primary Action: Close Report */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCloseDialog(report);
                            }}
                            className="p-2 rounded-lg transition-all hover:scale-110 hover:bg-error/10 text-error"
                            title="Close Report"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              task_alt
                            </span>
                          </button>

                          {/* View */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewReport(report);
                            }}
                            className="p-2 rounded-lg transition-all hover:scale-110 hover:bg-primary/10 text-primary"
                            title="View Report Details"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              open_in_new
                            </span>
                          </button>

                          {/* Mail */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setMailTarget(report);
                            }}
                            className="p-2 rounded-lg transition-all hover:scale-110 hover:bg-secondary/10 text-secondary relative"
                            title={report.mailSent ? "Resend Report Email" : "Send Report Email"}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {report.mailSent ? "mark_email_read" : "mail"}
                            </span>
                          </button>

                          {/* Download */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(report);
                            }}
                            className="p-2 rounded-lg transition-all hover:scale-110 hover:bg-primary/10 text-primary"
                            title="Download PDF"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              download
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant flex-wrap gap-2">
            <span>
              Showing <strong>{filtered.length}</strong> of{" "}
              <strong>{openReports.length}</strong> open reports
            </span>
            <div className="flex gap-3 text-[12px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-error/60" />
                NC: {ncCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/40" />
                OFI: {ofiCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Open Report Detail Modal */}
      {detailTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDetailTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-3xl z-10 flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-outline-variant/10 shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-headline-md text-on-surface">
                      {detailTarget.iqrNumber}
                    </h2>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase bg-primary/10 text-primary">
                      {detailTarget.status ?? "OPEN"}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1 font-body-md">
                    IQA Reference : {detailTarget.iqaNumber}
                  </p>
                </div>

                <button
                  onClick={() => setDetailTarget(null)}
                  className="p-2 rounded-full hover:bg-surface-container transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
                <div>
                  <p className="text-xs text-on-surface-variant">IQR Number</p>
                  <p className="font-semibold text-on-surface font-data-mono">
                    {detailTarget.iqrNumber}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant">IQA Reference</p>
                  <p className="font-semibold text-on-surface font-data-mono">
                    {detailTarget.iqaNumber}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant">Prakalpa</p>
                  <p className="font-semibold text-on-surface">
                    {detailTarget.prakalpa}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Location</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      location_on
                    </span>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.location}
                      {detailTarget.sublocation
                        ? `, ${detailTarget.sublocation}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Coordinator</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      person
                    </span>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.auditCoordinator || "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Auditors</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      badge
                    </span>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.auditors?.join(", ") ||
                        detailTarget.auditor ||
                        "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Visit Date</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      calendar_today
                    </span>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.visitDate
                        ? new Date(detailTarget.visitDate).toLocaleDateString("en-IN")
                        : "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Visit Time</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">
                      schedule
                    </span>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.visitTime || "—"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-on-surface-variant mb-1">Classification</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full font-bold text-xs ${
                      detailTarget.severity === "non_conformance"
                        ? "bg-error/10 text-error"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {detailTarget.severity === "non_conformance"
                      ? "🚩 Non-Conformance"
                      : "Open For Improvement"}
                  </span>
                </div>
              </div>

              <div>
                <p className="font-semibold text-on-surface mb-2">Audit Findings</p>
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 shadow-sm whitespace-pre-wrap leading-relaxed font-body-md text-on-surface">
                  {detailTarget.findings || "No findings recorded."}
                </div>
              </div>

              {/* Corrective Action Details if present */}
              {detailTarget.actionTaken && (
                <div>
                  <p className="font-semibold text-on-surface mb-2">
                    Corrective Action Taken
                  </p>
                  <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-5 whitespace-pre-wrap font-body-md text-on-surface leading-relaxed">
                    {detailTarget.actionTaken}
                  </div>
                </div>
              )}

              {detailTarget.completionRemarks && (
                <div>
                  <p className="font-semibold text-on-surface mb-2">
                    Completion Remarks
                  </p>
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 whitespace-pre-wrap font-body-md text-on-surface leading-relaxed">
                    {detailTarget.completionRemarks}
                  </div>
                </div>
              )}

              {detailTarget.closedBy && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-on-surface-variant">Closed By</p>
                    <p className="font-semibold text-on-surface">{detailTarget.closedBy}</p>
                  </div>
                  <div>
                    <p className="text-xs text-on-surface-variant">Closed On</p>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.closedAt
                        ? new Date(detailTarget.closedAt).toLocaleString("en-IN")
                        : "—"}
                    </p>
                  </div>
                </div>
              )}

              {/* Evidence Files Section */}
              {detailTarget.proofFiles && detailTarget.proofFiles.length > 0 && (
                <div>
                  <p className="font-semibold text-on-surface mb-2">Evidence Files</p>
                  <div className="flex flex-wrap gap-2">
                    {detailTarget.proofFiles.map((file) => (
                      <div
                        key={file}
                        className="px-3 py-2 rounded-lg border border-secondary/20 bg-secondary/5 text-secondary text-sm flex items-center gap-2 font-label-md"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          attach_file
                        </span>
                        {file}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-outline-variant/10 shrink-0 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => setMailTarget(detailTarget)}
                  className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
                  title="Send Email"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    mail
                  </span>
                </button>
                <button
                  onClick={() => handleDownload(detailTarget)}
                  className="px-4 py-2 rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
                  title="Download PDF"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>
                </button>
              </div>

              <div className="flex gap-2">
                {detailTarget.status !== "closed" && (
                  <button
                    onClick={() => handleOpenCloseDialog(detailTarget)}
                    className="px-5 py-2 bg-error text-white rounded-lg font-bold hover:brightness-110 transition-all font-label-md"
                  >
                    Close Report
                  </button>
                )}
                <button
                  onClick={() => setDetailTarget(null)}
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg font-bold hover:brightness-110 transition-all font-label-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive 2-Step Close Report Form Dialog */}
      {closeTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setCloseTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10 p-6 space-y-4">
            <div className="border-b border-outline-variant/10 pb-3">
              <h3 className="font-headline-sm text-on-surface">
                Close Report — {closeTarget.iqrNumber}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 font-body-md">
                Please enter the corrective action details to complete report closure.
              </p>
            </div>

            {/* Audit Finding Card */}
            <div className="rounded-lg bg-surface-container-low p-3 border border-outline-variant/20">
              <p className="text-xs font-semibold text-on-surface mb-1 font-label-md">
                Audit Finding
              </p>
              <p className="text-sm whitespace-pre-wrap font-body-md text-on-surface-variant leading-relaxed">
                {closeTarget.findings}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-label-md text-on-surface-variant mb-1 font-semibold">
                  Action Taken *
                </label>
                <textarea
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="Describe the corrective action taken to address finding..."
                  rows={3}
                  className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-label-md text-on-surface-variant mb-1 font-semibold">
                  Completion Remarks (Optional)
                </label>
                <textarea
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  placeholder="Additional observations or verification remarks..."
                  rows={2}
                  className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm resize-none"
                />
              </div>
            </div>

            {/* Confirmation Banner */}
            <div className="rounded-lg border border-error/20 bg-error/5 p-3">
              <div className="flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-error text-[20px] mt-0.5">
                  warning
                </span>
                <div>
                  <p className="font-semibold text-error text-xs font-label-md">
                    Confirm Report Closure
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-normal font-body-md">
                    Once confirmed, this report will be marked as closed, removed from Open Reports, and the corrective action will become part of the permanent audit record.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/10">
              <button
                type="button"
                onClick={() => setCloseTarget(null)}
                className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!actionTaken.trim() || closing}
                onClick={handleConfirmCloseReport}
                className="px-5 py-2 rounded-lg bg-error text-white font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center gap-2 font-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">
                  task_alt
                </span>
                {closing ? "Closing..." : "Confirm Closure"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise In-App Success Overlay */}
      {successOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSuccessOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-floating p-8 w-full max-w-md text-center z-10 animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-secondary text-[36px] filled">
                  task_alt
                </span>
              </div>
            </div>

            <h3 className="font-headline-sm text-on-surface mb-2">
              Report Closed Successfully
            </h3>

            <p className="text-on-surface-variant text-sm font-body-md mb-6 leading-relaxed">
              {lastClosedNumber ? `${lastClosedNumber} has been closed. ` : ""}
              The report has been marked as closed and moved to All Reports.
            </p>

            <button
              className="w-full py-2.5 bg-primary text-on-primary rounded-lg font-bold font-label-md hover:brightness-110 transition-all"
              onClick={() => setSuccessOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {mailTarget && (
        <SendReportEmailModal
          report={mailTarget}
          onClose={() => setMailTarget(null)}
          onSent={loadReports}
        />
      )}
    </div>
  );
}