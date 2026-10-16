import { ActionEvidenceList } from "../components/action-evidence-list";
import { actionEvidenceStatus } from "../../../../shared/evidence-status.mjs";
import { sortAuditRecords } from "../../../../shared/audit-order.mjs";
import { getRequestErrorMessage, logRequestError } from "../services/request-errors";
import api from "../services/api";
import { useManagerPrakalpaScope } from "../components/management/use-manager-prakalpas";
import { FilterToolbar } from "../components/filters/filter-toolbar";
import { FilterSelect } from "../components/filters/filter-select";
import { FilterText } from "../components/filters/filter-text";
import {
  useState,
  useMemo,
  useEffect,
} from "react";
import {
  useApp,
  PRAKALPAS,
  AUDIT_COORDINATORS,
} from "../context/app-context";
import {
  getReports,
  downloadReportPDF,
  updateReport,
  returnReportToPrakalpa,
  verifyAndCloseReport,
  sendReportToPrakalpa,
  downloadReportActionProof,
} from "../services/reportService";

// Step 5: Updated Report Interface
interface CompletedAllClear {
  _id: string;
  iqaNumber: string;
  prakalpa: string;
  location: string;
  leadAuditor: string;
  auditCoordinator: string;
  approvedAt?: string;
}

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
  actionProofFiles?: string[];
  withdrawnActionProofFiles?: {token:string;status:string;at?:string}[];
  hasChecklist: boolean;
  createdAt: string;
  updatedAt?: string;
  prakalphaPramukh?: string;
  auditor?: string;
  status?: string;
  actionTaken?: string;
  completionRemarks?: string;
  closedBy?: string;
  closedAt?: string;
  reportCreatedOn?: string;
  reportClosedOn?: string;
  mailSent?: boolean;
  mailSentAt?: string;
  mailSentTo?: string[];

  // Corrective-action workflow
  workflowStatus?: string;
  coordinatorVerificationRemarks?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  actionSubmittedBy?: string;
  actionSubmittedAt?: string;
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
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `AllReports_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Calendar-day age, using India-local dates (not elapsed 24-hour periods).
// Null means that no reliable start date was supplied.
function reportDaysOpen(start?: string | null, end?: string | null): number | null {
  if (!start) return null;
  const first = new Date(start);
  const last = end ? new Date(end) : new Date();
  if (!Number.isFinite(first.getTime()) || !Number.isFinite(last.getTime())) return null;
  const calendarDay = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(date);
    const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    return Date.UTC(part("year"), part("month") - 1, part("day"));
  };
  return Math.max(0, Math.round((calendarDay(last) - calendarDay(first)) / 86400000));
}

export default function AllReportsPage() {
  const { currentUser } = useApp();
  const managerScope = useManagerPrakalpaScope(currentUser);
  const managerPrakalpas = managerScope.names;
  const [reportsError, setReportsError] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [completedAllClear, setCompletedAllClear] = useState<CompletedAllClear[]>([]);
  const [allClearError, setAllClearError] = useState("");
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);

  // Coordinator corrective-action review
  const [verificationRemarks, setVerificationRemarks] = useState("");
  const [processingVerification, setProcessingVerification] = useState(false);
  const [
    sendingToPrakalpa,
    setSendingToPrakalpa,
  ] = useState(false);



  // Edit State
  const [editTarget, setEditTarget] = useState<Report | null>(null);
  const [editFindings, setEditFindings] = useState("");
  const [editSeverity, setEditSeverity] = useState<string>("open_for_improvement");
  const [savingEdit, setSavingEdit] = useState(false);

  const [filterAuditId, setFilterAuditId] = useState("");
  const [filterReportId, setFilterReportId] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterClassification, setFilterClassification] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  const canViewAllClear = ['auditor', 'audit_coordinator', 'admin', 'super_admin']
    .includes(currentUser?.role ?? '');

  useEffect(() => {
    if (!canViewAllClear) return;
    let cancelled = false;
    api.get('/zero-findings/completed-summaries')
      .then(response => {
        if (!cancelled) {
          setCompletedAllClear(response.data?.data ?? []);
          setAllClearError('');
        }
      })
      .catch(() => {
        if (!cancelled) setAllClearError('Unable to load completed All Clear audits.');
      });
    return () => { cancelled = true; };
  }, [canViewAllClear]);

  const downloadAllClear = async (id: string) => {
    try {
      const response = await api.get(
        `/zero-findings/scheduled-audits/${encodeURIComponent(id)}/summary.pdf`,
        { responseType: 'blob' }
      );
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `all-clear-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setAllClearError('Unable to download the All Clear PDF.');
    }
  };

  const loadReports = async () => {
    setReportsError("");
    try {
      const data = await getReports();
      setReports(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setReportsError(getRequestErrorMessage(err, "Unable to load reports. Refresh the page and try again."));
      logRequestError("Error loading reports:", err);
    }
  };

  const handleDownload = async (report: Report) => {
    try {
      await downloadReportPDF(report._id);
    } catch (error) {
      logRequestError("Report request failed", error);
    }
  };

  const handleViewReport = (report: Report) => {
    setDetailTarget(report);
    setVerificationRemarks(
      report.coordinatorVerificationRemarks || ""
    );
  };

  const handleEditReport = (report: Report) => {
    if (currentUser.role !== "audit_coordinator" || report.workflowStatus === "verified_closed") return;
    setEditTarget(report);
    setEditFindings(report.findings || "");
    setEditSeverity(report.severity || "open_for_improvement");
  };

  const handleSaveEdit = async () => {
    if (!editTarget || currentUser.role !== "audit_coordinator") return;

    setSavingEdit(true);
    try {
      await updateReport(editTarget._id, {
        findings: editFindings,
        severity: editSeverity,
      });

      await loadReports();
      setEditTarget(null);
    } catch (err) {
      logRequestError("Report request failed", err);
      alert("Unable to update report.");
    } finally {
      setSavingEdit(false);
    }
  };

  const isAuditor = currentUser.role === "auditor";
  const isManager = currentUser.role === "prakalpa_manager";
  const isCoordinator =
    currentUser.role === "audit_coordinator";

  const handleSendToPrakalpa = async () => {
    if (!detailTarget) {
      return;
    }

    const confirmed = window.confirm(
      `Send ${detailTarget.iqrNumber} to the Prakalpa for corrective action?`
    );

    if (!confirmed) {
      return;
    }

    setSendingToPrakalpa(true);

    try {
      await sendReportToPrakalpa(
        detailTarget._id
      );

      await loadReports();

      setDetailTarget(null);

      alert(
        "Official IQR sent to Prakalpa successfully."
      );
    } catch (err) {
      logRequestError("Unable to send IQR to Prakalpa:", err);

      alert(
        "Unable to send the IQR to Prakalpa."
      );
    } finally {
      setSendingToPrakalpa(false);
    }
  };



  const handleReturnToPrakalpa = async () => {
    if (!detailTarget) {
      return;
    }

    const remarks =
      verificationRemarks.trim();

    if (!remarks) {
      alert(
        "Return remarks are required."
      );
      return;
    }

    setProcessingVerification(true);

    try {
      await returnReportToPrakalpa(
        detailTarget._id,
        {
          coordinatorVerificationRemarks:
            remarks,
        }
      );

      await loadReports();

      setDetailTarget(null);
      setVerificationRemarks("");

      alert(
        "Corrective action returned to Prakalpa successfully."
      );
    } catch (err) {
      logRequestError("Unable to return corrective action:", err);

      alert(
        "Unable to return corrective action to Prakalpa."
      );
    } finally {
      setProcessingVerification(false);
    }
  };

  const handleVerifyAndClose = async () => {
    if (!detailTarget) {
      return;
    }

    const confirmed =
      window.confirm(
        `Verify the corrective action and close ${detailTarget.iqrNumber}?`
      );

    if (!confirmed) {
      return;
    }

    setProcessingVerification(true);

    try {
      await verifyAndCloseReport(
        detailTarget._id,
        {
          coordinatorVerificationRemarks:
            verificationRemarks.trim(),
        }
      );

      await loadReports();

      setDetailTarget(null);
      setVerificationRemarks("");

      alert(
        "Corrective action verified and IQR closed successfully."
      );
    } catch (err) {
      logRequestError("Unable to verify corrective action:", err);

      alert(
        "Unable to verify corrective action and close the IQR."
      );
    } finally {
      setProcessingVerification(false);
    }
  };

  const filterReports = useMemo(() => reports.filter(r =>
    (isManager ? managerPrakalpas.includes(r.prakalpa) : isAuditor ? (r.auditors || []).includes(currentUser.name || "") || r.auditor === currentUser.name : true)
  ), [reports, isManager, isAuditor, currentUser, managerPrakalpas]);
  const filterPrakalpaOptions = useMemo(() => [...new Set(filterReports.map(r => r.prakalpa).filter(Boolean))], [filterReports]);
  const filterCoordinatorOptions = useMemo(() => [...new Set(filterReports.map(r => r.auditCoordinator).filter(Boolean))], [filterReports]);

  const filtered = useMemo(() => {
    return sortAuditRecords(reports).filter((r) => {
      const q = search.toLowerCase();
      const reportNum = r.iqrNumber || "";
      const ms =
        !q ||
        reportNum.toLowerCase().includes(q) ||
        (r.iqaNumber || "").toLowerCase().includes(q) ||
        (r.prakalpa || "").toLowerCase().includes(q) ||
        (r.findings || "").toLowerCase().includes(q);

      const matchAuditId =
        !filterAuditId ||
        (r.iqaNumber || "")
          .toLowerCase()
          .includes(filterAuditId.toLowerCase());

      const matchReportId =
        !filterReportId ||
        reportNum.toLowerCase().includes(filterReportId.toLowerCase());

      const matchPrakalpa = filterPrakalpa === "All" || r.prakalpa === filterPrakalpa;

      const matchClass =
        filterClassification === "All" ||
        (filterClassification === "NC"
          ? r.severity === "non_conformance"
          : r.severity === "open_for_improvement");

      const matchCoord =
        filterCoordinator === "All" || r.auditCoordinator === filterCoordinator;

      const matchStatus =
        filterStatus === "All" ||
        (r.status ?? "open").toLowerCase() === filterStatus.toLowerCase();

      const matchUser = isManager
        ? managerPrakalpas.includes(r.prakalpa)
        : isAuditor
        ? (r.auditors || []).includes(currentUser.name || "") ||
          r.auditor === currentUser.name
        : true;

      return (
        ms &&
        matchAuditId &&
        matchReportId &&
        matchPrakalpa &&
        matchClass &&
        matchCoord &&
        matchStatus &&
        matchUser
      );
    });
  }, [
    reports,
    search,
    filterAuditId,
    filterReportId,
    filterPrakalpa,
    filterClassification,
    filterCoordinator,
    filterStatus,
    isManager,
    isAuditor,
    currentUser,
    managerPrakalpas,
  ]);

  const clearFilters = () => {
    setSearch("");
    setFilterAuditId("");
    setFilterReportId("");
    setFilterPrakalpa("All");
    setFilterClassification("All");
    setFilterCoordinator("All");
    setFilterStatus("All");
  };

  const ncCount = useMemo(
    () => filtered.filter((r) => r.severity === "non_conformance").length,
    [filtered]
  );

  const ofiCount = useMemo(
    () => filtered.filter((r) => r.severity === "open_for_improvement").length,
    [filtered]
  );

  // Step 8: Count red-flagged open reports (>30 days open)
  const redFlaggedCount = useMemo(() => {
    return filtered.filter((r) => {
      const startDate = new Date(r.reportCreatedOn || r.createdAt);
      const endDate =
        (r.status ?? "open") === "closed" && (r.reportClosedOn || r.closedAt)
          ? new Date(r.reportClosedOn || r.closedAt!)
          : new Date();
      const daysOpen = reportDaysOpen(Number.isFinite(startDate.getTime()) ? startDate.toISOString() : null, Number.isFinite(endDate.getTime()) ? endDate.toISOString() : null) ?? 0;
      return (r.status ?? "open") === "open" && daysOpen > 30;
    }).length;
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      {(reportsError || managerScope.error) && <p role="alert" className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">{reportsError || managerScope.error}</p>}
      {managerScope.loading && <p role="status">Verifying your assigned Prakalpas…</p>}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">All Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} reports
            {isManager ? ` — ${managerPrakalpas.join(", ")}` : ""}
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

      {canViewAllClear && (
        <section className="rounded-xl border border-outline-variant/30 bg-white p-4 sm:p-6 space-y-3">
          <h3 className="text-lg font-semibold">Completed All Clear Audits</h3>
          <p className="text-sm text-on-surface-variant">
            Approved satisfactory audit summaries.
            These are not finding-based IQRs.
          </p>
          {allClearError && <p role="alert" className="text-red-700">{allClearError}</p>}
          {completedAllClear.length === 0 && (
            <p className="text-sm text-on-surface-variant">
              No completed All Clear audits available for your account.
            </p>
          )}
          {completedAllClear.map(audit => (
            <div key={audit._id}
              className="flex flex-wrap items-center justify-between gap-3 border-t py-3">
              <div>
                <p className="font-medium">{audit.iqaNumber} — {audit.prakalpa}</p>
                <p className="text-sm text-on-surface-variant">
                  {audit.location} · No Findings — Audit Satisfactory
                </p>
              </div>
              <button type="button"
                className="rounded-lg border px-3 py-2 text-sm font-medium"
                onClick={() => void downloadAllClear(audit._id)}>
                Download All Clear PDF
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            Total Reports
          </p>
          <p className="text-3xl font-bold text-primary mt-2 font-data-mono">
            {filtered.length}
          </p>
        </div>

        <div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            Open Reports
          </p>
          <p className="text-3xl font-bold text-error mt-2 font-data-mono">
            {filtered.filter((r) => (r.status ?? "open") === "open").length}
          </p>
        </div>

        <div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            Closed Reports
          </p>
          <p className="text-3xl font-bold text-secondary mt-2 font-data-mono">
            {filtered.filter((r) => (r.status ?? "").toLowerCase() === "closed").length}
          </p>
        </div>

        {ncCount > 0 && (<div className="bg-white border border-outline-variant/20 rounded-xl p-4 shadow-soft">
          <p className="text-on-surface-variant text-sm font-label-md">
            NC Reports
          </p>
          <p className="text-3xl font-bold text-error mt-2 font-data-mono">
            {ncCount}
          </p>
        </div>)}
      </div>

      {/* Warning Banner */}
      {redFlaggedCount > 0 && (
        <div className="bg-error/5 border border-error/30 rounded-xl p-4 flex gap-4 items-center">
          <span className="material-symbols-outlined text-error text-[24px]">
            flag
          </span>
          <div>
            <p className="font-bold text-error font-label-md">
              {redFlaggedCount} report(s) open for more than 30 days.
            </p>
            <p className="text-error/70 font-label-md text-sm">
              Immediate attention required.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <FilterToolbar search={{ value: search, onChange: setSearch, placeholder: "Search reports..." }}
          filters={[
            ...(search ? [{ key: "search", label: "Search", value: search, onRemove: () => setSearch("") }] : []),
            ...(filterAuditId !== "" ? [{ key: "filterAuditId", label: "Audit ID", value: filterAuditId, onRemove: () => setFilterAuditId("") }] : []),
            ...(filterReportId !== "" ? [{ key: "filterReportId", label: "IQR ID", value: filterReportId, onRemove: () => setFilterReportId("") }] : []),
            ...(!isManager && filterPrakalpa !== "All" ? [{ key: "filterPrakalpa", label: "Prakalpa", value: filterPrakalpa, onRemove: () => setFilterPrakalpa("All") }] : []),
            ...(filterClassification !== "All" ? [{ key: "filterClassification", label: "Classification", value: filterClassification, onRemove: () => setFilterClassification("All") }] : []),
            ...(filterStatus !== "All" ? [{ key: "filterStatus", label: "Status", value: filterStatus, onRemove: () => setFilterStatus("All") }] : []),
            ...(filterCoordinator !== "All" ? [{ key: "filterCoordinator", label: "Coordinator", value: filterCoordinator, onRemove: () => setFilterCoordinator("All") }] : [])
          ]}
          onClearAll={clearFilters} resultCount={filtered.length} resultLabel="reports shown">
          <FilterText label="Audit ID" value={filterAuditId} onChange={setFilterAuditId} placeholder="Partial Audit ID" />
          <FilterText label="IQR ID" value={filterReportId} onChange={setFilterReportId} placeholder="Partial IQR ID" />
          {!isManager && <FilterSelect label="Prakalpa" value={filterPrakalpa} onChange={setFilterPrakalpa} options={filterPrakalpaOptions.map(value => ({ value, label: value }))} searchable allLabel="All Prakalpas" />}
          <FilterSelect label="Classification" value={filterClassification} onChange={setFilterClassification} options={[{ value: "NC", label: "NC" }, { value: "OFI", label: "OFI" }]} allLabel="All Types" />
          <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={[{ value: "open", label: "Open" }, { value: "closed", label: "Closed" }]} allLabel="All Statuses" />
          <FilterSelect label="Coordinator" value={filterCoordinator} onChange={setFilterCoordinator} options={filterCoordinatorOptions.map(value => ({ value, label: value }))} searchable allLabel="All Coordinators" />
        </FilterToolbar>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">
            description
          </span>
          <p className="font-headline-sm text-on-surface-variant/50">
            No reports match your filters.
          </p>
          <p className="font-body-md text-on-surface-variant/40">
            Try changing or clearing your search criteria.
          </p>
          <button
            onClick={clearFilters}
            className="mt-2 px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all"
          >
            Clear Filters
          </button>
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
                  // Step 8: Calculate Days Open from explicit lifecycle fields
                  const startDate = new Date(
                    report.reportCreatedOn || report.createdAt
                  );
                  const endDate =
                    (report.status ?? "open") === "closed" &&
                    (report.reportClosedOn || report.closedAt)
                      ? new Date(report.reportClosedOn || report.closedAt!)
                      : new Date();

                  const daysOpen = reportDaysOpen(Number.isFinite(startDate.getTime()) ? startDate.toISOString() : null, Number.isFinite(endDate.getTime()) ? endDate.toISOString() : null) ?? 0;

                  const isRedFlagged = (report.status ?? "open") === "open" && daysOpen > 30;
                  const ncObs = report.severity === "non_conformance" ? 1 : 0;
                  const ofiObs = report.severity === "open_for_improvement" ? 1 : 0;

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
                          isRedFlagged
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
                          {isRedFlagged && (
                            <span
                              className="material-symbols-outlined text-error text-[16px]"
                              title="Report open for more than 30 days"
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
                              ? isRedFlagged
                                ? "bg-error/10 text-error"
                                : "bg-primary/10 text-primary"
                              : "bg-secondary/10 text-secondary"
                          }`}
                        >
                          {report.status ?? "open"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-data-mono text-[12px] ${
                            daysOpen > 30 && (report.status ?? "open") === "open"
                              ? "text-error font-bold"
                              : daysOpen > 14 && (report.status ?? "open") === "open"
                              ? "text-error/60"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {daysOpen}d
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Coordinator-only editing */}
                          {isCoordinator && report.workflowStatus !== "verified_closed" && <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditReport(report);
                            }}
                            className="p-2 rounded-lg transition-all hover:scale-110 hover:bg-secondary/10 text-secondary"
                            title="Edit Report"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              edit
                            </span>
                          </button>}

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
          <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center flex-wrap gap-4 font-label-md text-on-surface-variant">
            <div>
              Showing <strong>{filtered.length}</strong> of{" "}
              <strong>{reports.length}</strong> reports
            </div>

            <div className="flex gap-6 flex-wrap">
              <span className="text-primary font-semibold">
                Open : {filtered.filter((r) => (r.status ?? "open").toLowerCase() === "open").length}
              </span>

              <span className="text-secondary font-semibold">
                Closed : {filtered.filter((r) => r.status === "closed").length}
              </span>

              {ncCount > 0 && (<span className="text-error font-semibold">
                NC : {ncCount}
              </span>)}

              {ofiCount > 0 && (<span className="text-primary font-semibold">
                OFI : {ofiCount}
              </span>)}
            </div>
          </div>
        </div>
      )}

      {/* Rich Enterprise Report Detail Modal */}
      {detailTarget && (() => {
        // Step 8: Modal Days Open Scope
        const startDate = new Date(
          detailTarget.reportCreatedOn || detailTarget.createdAt
        );

        const endDate =
          detailTarget.status === "closed" &&
          (detailTarget.reportClosedOn || detailTarget.closedAt)
            ? new Date(detailTarget.reportClosedOn || detailTarget.closedAt!)
            : new Date();

        const modalDaysOpen = reportDaysOpen(Number.isFinite(startDate.getTime()) ? startDate.toISOString() : null, Number.isFinite(endDate.getTime()) ? endDate.toISOString() : null) ?? 0;

        return (
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
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                          (detailTarget.status ?? "open") === "closed"
                            ? "bg-secondary/10 text-secondary"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {detailTarget.status ?? "Open"}
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
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-on-surface-variant">IQR Number</p>
                    <p className="font-semibold text-on-surface font-data-mono">{detailTarget.iqrNumber}</p>
                  </div>

                  <div>
                    <p className="text-xs text-on-surface-variant">IQA Reference</p>
                    <p className="font-semibold text-on-surface font-data-mono">{detailTarget.iqaNumber}</p>
                  </div>

                  <div>
                    <p className="text-xs text-on-surface-variant">Prakalpa</p>
                    <p className="font-semibold text-on-surface">{detailTarget.prakalpa}</p>
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

                  {/* Step 6: Report Created On */}
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Report Created On</p>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.reportCreatedOn || detailTarget.createdAt
                        ? new Date(
                            detailTarget.reportCreatedOn || detailTarget.createdAt
                          ).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
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

                  {/* Step 7: Report Closed On */}
                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Report Closed On</p>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.reportClosedOn || detailTarget.closedAt
                        ? new Date(
                            detailTarget.reportClosedOn || detailTarget.closedAt!
                          ).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Closed By</p>
                    <p className="font-semibold text-on-surface">
                      {detailTarget.closedBy || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-on-surface-variant mb-1">Days Open</p>
                    <p
                      className={`font-semibold ${
                        modalDaysOpen > 30 && detailTarget.status === "open"
                          ? "text-error"
                          : "text-on-surface"
                      }`}
                    >
                      {modalDaysOpen} Day{modalDaysOpen !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-on-surface mb-2">Audit Findings</p>
                  <div className="rounded-xl border border-primary/10 bg-primary/5 p-5 shadow-sm whitespace-pre-wrap leading-relaxed font-body-md text-on-surface">
                    {detailTarget.findings || "No findings recorded."}
                  </div>
                </div>

                {/* Action Taken Section */}
                <div>
                  <p className="font-semibold text-on-surface mb-2">Action Taken</p>
                  <div className="rounded-xl border border-outline-variant/20 p-4 bg-surface-container-lowest font-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                    {detailTarget.actionTaken || "—"}
                  </div>
                </div>

                <ActionEvidenceList report={detailTarget} onOpen={token=>void downloadReportActionProof(detailTarget._id,token)} />

                {/* Completion Remarks Section */}
                <div>
                  <p className="font-semibold text-on-surface mb-2">Completion Remarks</p>
                  <div className="rounded-xl border border-outline-variant/20 p-4 bg-surface-container-lowest font-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                    {detailTarget.completionRemarks || "—"}
                  </div>
                </div>

                
                  {/* Coordinator → Prakalpa Release */}
                  {isCoordinator &&
                    detailTarget.workflowStatus ===
                      "coordinator_generated" && (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">
                              send
                            </span>

                            <p className="font-semibold text-on-surface">
                              Release Official IQR
                            </p>
                          </div>

                          <p className="text-sm text-on-surface-variant mt-1">
                            Send this coordinator-generated official IQR
                            to the Prakalpa for corrective action.
                          </p>
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleSendToPrakalpa}
                            disabled={sendingToPrakalpa}
                            className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              send
                            </span>

                            {sendingToPrakalpa
                              ? "Sending..."
                              : "Send to Prakalpa"}
                          </button>
                        </div>
                      </div>
                    )}

                  {isCoordinator && ["sent_to_prakalpa", "returned_to_prakalpa"].includes(detailTarget.workflowStatus || "") && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" title="Awaiting Actions Taken from Prakalpa Manager">
                      <span className="material-symbols-outlined align-middle mr-2">pending_actions</span>
                      Verify & Close unavailable — awaiting Actions Taken from Prakalpa Manager for this IQR.
                    </div>
                  )}
                  {/* Coordinator Corrective-Action Verification */}
                {isCoordinator &&
                  detailTarget.workflowStatus === "action_submitted" && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">
                            fact_check
                          </span>

                          <p className="font-semibold text-on-surface">
                            Coordinator Verification
                          </p>
                        </div>

                        <p className="text-sm text-on-surface-variant mt-1">
                          Review the Prakalpa corrective action before
                          returning it for correction or closing the IQR.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor="coordinator-verification-remarks"
                          className="font-semibold block text-sm text-on-surface mb-1"
                        >
                          Verification Remarks
                        </label>

                        <textarea
                          id="coordinator-verification-remarks"
                          rows={4}
                          value={verificationRemarks}
                          onChange={(e) =>
                            setVerificationRemarks(e.target.value)
                          }
                          disabled={processingVerification}
                          className="w-full border border-outline-variant/40 rounded-xl p-3 font-body-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none bg-white disabled:opacity-60"
                          placeholder="Add verification remarks. Remarks are required when returning the action to Prakalpa."
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                        <button
                          type="button"
                          onClick={handleReturnToPrakalpa}
                          disabled={processingVerification}
                          className="px-5 py-2.5 border border-error/40 text-error rounded-lg font-label-md font-bold hover:bg-error/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingVerification
                            ? "Processing..."
                            : "Return to Prakalpa"}
                        </button>

                        <button
                          type="button"
                          onClick={handleVerifyAndClose}
                          disabled={processingVerification}
                          className="px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processingVerification
                            ? "Processing..."
                            : "Verify & Close IQR"}
                        </button>
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
              <div className="p-4 border-t border-outline-variant/10 shrink-0 flex justify-end">
                <button
                  onClick={() => setDetailTarget(null)}
                  className="px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Report Modal */}
      {editTarget && isCoordinator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditTarget(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-3xl max-h-[92vh] overflow-y-auto z-10 flex flex-col">
            <div className="p-6 border-b border-outline-variant/10">
              <h2 className="font-headline-md text-on-surface">Edit Report</h2>
              <p className="text-sm text-on-surface-variant mt-1 font-data-mono">
                {editTarget.iqrNumber}
              </p>
            </div>

            <div className="p-6 space-y-6 flex-1">
              {/* Findings */}
              <div>
                <label className="font-semibold block text-sm text-on-surface mb-1">
                  Findings
                </label>
                <textarea
                  rows={6}
                  value={editFindings}
                  onChange={(e) => setEditFindings(e.target.value)}
                  className="w-full border border-outline-variant/40 rounded-xl p-3 font-body-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {/* Severity */}
              <div>
                <label className="font-semibold block text-sm text-on-surface mb-1">
                  Classification
                </label>
                <select
                  value={editSeverity}
                  onChange={(e) => setEditSeverity(e.target.value)}
                  className="w-full border border-outline-variant/40 rounded-xl p-3 font-body-md text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="non_conformance">Non-Conformance</option>
                  <option value="open_for_improvement">Open For Improvement</option>
                </select>
              </div>

            </div>

            <div className="border-t border-outline-variant/10 p-5 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="px-5 py-2 border border-outline-variant/40 rounded-lg font-label-md hover:bg-surface-container-low transition-colors text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all text-sm disabled:opacity-50"
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}