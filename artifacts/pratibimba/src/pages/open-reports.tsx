import { useManagerPrakalpas } from "../components/management/use-manager-prakalpas";
import { FilterToolbar } from "../components/filters/filter-toolbar";
import { FilterSelect } from "../components/filters/filter-select";
import { FilterText } from "../components/filters/filter-text";
import { useState, useMemo, useEffect } from "react";
import {
  useApp,
  PRAKALPAS,
  AUDIT_COORDINATORS,
} from "../context/app-context";
import {
  getReports,
  downloadReportPDF,
  submitPrakalpaCorrectiveAction,
  uploadReportActionProof,
  downloadReportActionProof,
  returnReportToPrakalpa,
  verifyAndCloseReport,
} from "../services/reportService";
import {
  getScheduledAudits,
} from "../services/scheduledAuditService";

import SendScheduledAuditEmailModal from "../components/send-scheduled-audit-email-modal";
import {
  getPrakalpas,
  type Prakalpa,
} from "../services/prakalpaService";

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
  hasChecklist: boolean;
  createdAt: string;
  reportCreatedOn?: string;
  reportClosedOn?: string;
  prakalphaPramukh?: string;
  auditor?: string;
  status?: string;
  dueDate?: string;
  actionTaken?: string;
  completionRemarks?: string;
  closedBy?: string;
  closedAt?: string;
  workflowStatus?: string;
  coordinatorVerificationRemarks?: string;
  mailSent?: boolean;
  mailSentAt?: string;
  mailSentTo?: string[];
  workflowHistory?: Array<{
    action: string; performedAt?: string; performedBy?: string; role?: string;
    remarks?: string; actionTakenSnapshot?: string;
    completionRemarksSnapshot?: string; actionProofFilesSnapshot?: string[];
  }>;
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

export default function OpenReportsPage() {
  const { currentUser } = useApp();
  const managerPrakalpas = useManagerPrakalpas(currentUser);
  const [reports, setReports] = useState<Report[]>([]);
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);

  // IQA grouping / expansion state
  const [expandedIQAs, setExpandedIQAs] = useState<Record<string, boolean>>({});

  // IQA-level email state. Email belongs to ScheduledAudit, not an individual IQR.
  const [scheduledAudits, setScheduledAudits] = useState<any[]>([]);
  const [prakalpas, setPrakalpas] = useState<Prakalpa[]>([]);
  const [iqaMailTarget, setIqaMailTarget] = useState<any | null>(null);

  const [iqaMailDraft, setIqaMailDraft] = useState<{
    to: string;
    cc: string;
    subject: string;
    message: string;
    attachments: { name: string; reportId: string }[];
  } | null>(null);

  // Corrective Action Form State
  const [actionTarget, setActionTarget] = useState<Report | null>(null);
  const [actionTaken, setActionTaken] = useState("");
  const [actionProof, setActionProof] = useState<File | null>(null);
  const [actionProofError, setActionProofError] = useState("");
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [closing, setClosing] = useState(false);
  const [verificationRemarks, setVerificationRemarks] = useState("");
  const [showIqrHistory, setShowIqrHistory] = useState(false);
  const [processingVerification, setProcessingVerification] = useState(false);
  const [workflowNotice, setWorkflowNotice] = useState<{ title: string; message: string; kind: "success" | "error" } | null>(null);
  const [workflowConfirm, setWorkflowConfirm] = useState<"return" | "close" | null>(null);

  // In-App Success Modal State
  const [successOpen, setSuccessOpen] = useState(false);
  const [lastSubmittedNumber, setLastSubmittedNumber] = useState<string>("");

  const [filterReportId, setFilterReportId] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterClassification, setFilterClassification] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadReports();
    loadScheduledAudits();
    loadPrakalpas();
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

  const loadPrakalpas = async () => {
    try {
      const data = await getPrakalpas();
      setPrakalpas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading Prakalpa master data:", error);
    }
  };

  const loadScheduledAudits = async () => {
    try {
      const data = await getScheduledAudits();
      setScheduledAudits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading scheduled audits:", error);
    }
  };

  const handleSendIQAEmail = (iqaNumber: string) => {
    // Generated reports are the source for Open Reports email preparation.
    // The backend independently verifies authorization using report links.
    const groupReports = reports.filter(
      (report) => report.iqaNumber === iqaNumber
    );

    if (groupReports.length === 0) {
      alert(`No generated reports were found for ${iqaNumber}.`);
      return;
    }

    // The IQA-report email modal uses report metadata for its preview.
    // Its sending endpoint uses the IQA number, not this record's ID.
    const audit = groupReports[0];


    const openIQRs = groupReports.filter(
      (report) =>
        !report.status ||
        report.status.toLowerCase() === "open"
    );

    const normalize = (value: unknown) =>
      String(value ?? "")
        .trim()
        .toLowerCase();

    const prakalpaMaster = prakalpas.find(
      (item) =>
        normalize(item.name) === normalize(audit.prakalpa)
    );

    if (!prakalpaMaster) {
      alert(
        `Cannot prepare ${iqaNumber}. Prakalpa "${audit.prakalpa}" was not found in Prakalpa master data.`
      );
      return;
    }

    const pramukhEmail =
      prakalpaMaster.prakalpaPramukhEmail?.trim();

    if (!pramukhEmail) {
      alert(
        `Cannot prepare ${iqaNumber}. Prakalpa Pramukh email is not configured for "${prakalpaMaster.name}". Please configure it in Prakalpa Management first.`
      );
      return;
    }

    const ncCount = openIQRs.filter(
      (report) =>
        report.severity === "non_conformance"
    ).length;

    const ofiCount = openIQRs.filter(
      (report) =>
        report.severity === "open_for_improvement"
    ).length;

    const iqrLines =
      openIQRs.length > 0
        ? openIQRs
            .map(
              (report) =>
                `- ${report.iqrNumber}: ${
                  report.severity === "non_conformance"
                    ? "NC"
                    : "OFI"
                } — ${
                  report.findings ||
                  "No finding description"
                }`
            )
            .join("\n")
        : "- No open IQRs.";

    const subject =
      `Internal Quality Audit Report: ${iqaNumber} — ${audit.prakalpa || ""}`.trim();

    const message = [
      prakalpaMaster.prakalpaPramukh
        ? `Dear ${prakalpaMaster.prakalpaPramukh},`
        : "Dear Prakalpa Pramukh,",
      "",
      `Please find the Internal Quality Audit report for ${iqaNumber}.`,
      "",
      `IQA Reference: ${iqaNumber}`,
      `Prakalpa: ${audit.prakalpa || "—"}`,
      `Location: ${audit.location || "—"}${
        audit.sublocation
          ? ` / ${audit.sublocation}`
          : ""
      }`,
      `Audit Coordinator: ${
        audit.auditCoordinator || "—"
      }`,
      "",
      `Open IQRs: ${openIQRs.length}`,
      `Non-Conformances: ${ncCount}`,
      `Open for Improvement: ${ofiCount}`,
      "",
      "Open IQR Details:",
      iqrLines,
      "",
      "Please find the corresponding IQR reports attached.",
      "",
      "Regards,",
      "Pratibimba Audit Management System",
    ].join("\n");

    setIqaMailDraft({
      to: pramukhEmail,
      cc: prakalpaMaster.seniorEmail?.trim() || "",
      subject,
      message,
      attachments: openIQRs.map((report) => ({
        name: `${report.iqrNumber}.pdf`,
        reportId: report._id,
      })),
    });

    setIqaMailTarget(audit);
  };

  const handleViewReport = (report: Report) => {
    setDetailTarget(report);
    setShowIqrHistory(false);
    setVerificationRemarks("");
  };

  const handleDownload = async (report: Report) => {
    try {
      await downloadReportPDF(report._id);
    } catch (error) {
      console.error("Error downloading report PDF:", error);
    }
  };

  const handleOpenActionDialog = (report: Report) => {
    if (currentUser.role !== "prakalpa_manager" ||
      !["sent_to_prakalpa", "returned_to_prakalpa"].includes(report.workflowStatus || "")) return;
    setConfirmAction(false);
    setActionTarget(report);
    setActionTaken(report.workflowStatus === "returned_to_prakalpa" ? (report.actionTaken || "") : "");
    setActionProof(null);
    setActionProofError("");
    setCompletionRemarks(report.workflowStatus === "returned_to_prakalpa" ? (report.completionRemarks || "") : "");
  };

  const handleSubmitCorrectiveAction = async () => {
    if (!actionTarget || !actionTaken.trim() || currentUser.role !== "prakalpa_manager") return;
    setConfirmAction(false);

    setClosing(true);
    const iqrNum = actionTarget.iqrNumber;

    try {
      if (actionProof) {
        setActionProofError("");
        try { await uploadReportActionProof(actionTarget._id, actionProof); }
        catch (proofError) { setActionProofError("Proof upload failed. Corrective action was not submitted."); throw proofError; }
      }
      await submitPrakalpaCorrectiveAction(
        actionTarget._id,
        {
          actionTaken: actionTaken.trim(),
          completionRemarks:
            completionRemarks.trim(),
        }
      );

      setLastSubmittedNumber(iqrNum);
      setActionTarget(null);
      setConfirmAction(false);
      setDetailTarget(null);
      setActionTaken("");
      setCompletionRemarks("");

      await loadReports();

      setSuccessOpen(true);
    } catch (error) {
      console.error(
        "Error submitting corrective action:",
        error
      );
      setWorkflowNotice({ title: "Submission Failed", message: "Unable to submit corrective action. Please try again.", kind: "error" });
    } finally {
      setClosing(false);
    }
  };

  const handleCoordinatorReturn = async () => {
    if (!detailTarget || currentUser.role !== "audit_coordinator" || detailTarget.workflowStatus !== "action_submitted") return;
    if (!verificationRemarks.trim()) { setWorkflowNotice({ title: "Remarks Required", message: "Please enter Coordinator remarks before returning this IQR to the Prakalpa Manager.", kind: "error" }); return; }
    const returnedIqrNumber = detailTarget.iqrNumber;
    setProcessingVerification(true);
    try {
      await returnReportToPrakalpa(detailTarget._id, { coordinatorVerificationRemarks: verificationRemarks.trim() });
      await loadReports();
      setDetailTarget(null);
      setVerificationRemarks("");
      setWorkflowNotice({ title: "Returned to Prakalpa Manager", message: `${returnedIqrNumber} was returned for correction. The IQR remains open.`, kind: "success" });
    } catch (error) { console.error(error); setWorkflowNotice({ title: "Return Failed", message: "Unable to return Actions Taken. Please try again.", kind: "error" }); }
    finally { setProcessingVerification(false); }
  };

  const handleCoordinatorClose = async () => {
    if (!detailTarget || currentUser.role !== "audit_coordinator" || detailTarget.workflowStatus !== "action_submitted") return;

    const closedIqrNumber = detailTarget.iqrNumber;
    setProcessingVerification(true);
    try {
      await verifyAndCloseReport(detailTarget._id, { coordinatorVerificationRemarks: verificationRemarks.trim() });
      await loadReports();
      setDetailTarget(null);
      setVerificationRemarks("");
      setWorkflowNotice({ title: "IQR Verified & Closed", message: `${closedIqrNumber} has been verified and formally closed.`, kind: "success" });
    } catch (error) { console.error(error); setWorkflowNotice({ title: "Closure Failed", message: "Unable to verify and close this IQR. Please try again.", kind: "error" }); }
    finally { setProcessingVerification(false); }
  };

  const isAuditor = currentUser.role === "auditor";
  const isManager = currentUser.role === "prakalpa_manager";
  const isCoordinator = currentUser.role === "audit_coordinator";
  const canSubmitAction = (report: Report) => isManager &&
    ["sent_to_prakalpa", "returned_to_prakalpa"].includes(report.workflowStatus || "");
  const [confirmAction, setConfirmAction] = useState(false);

  // Filter for reports that are open (or missing status field)
  const openReports = useMemo(() => {
    return reports.filter(
      (r) => !r.status || r.status.toLowerCase() === "open"
    );
  }, [reports]);

  const filterReports = useMemo(() => reports.filter(r =>
    (!r.status || r.status.toLowerCase() === "open") && (isManager ? managerPrakalpas.includes(r.prakalpa) : isAuditor ? (r.auditors || []).includes(currentUser.name || "") || r.auditor === currentUser.name : true)
  ), [reports, isManager, isAuditor, currentUser, managerPrakalpas]);
  const filterPrakalpaOptions = useMemo(() => [...new Set(filterReports.map(r => r.prakalpa).filter(Boolean))], [filterReports]);
  const filterCoordinatorOptions = useMemo(() => [...new Set(filterReports.map(r => r.auditCoordinator).filter(Boolean))], [filterReports]);

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
        ? managerPrakalpas.includes(r.prakalpa)
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
    managerPrakalpas,
  ]);

  const groupedOpenReports = useMemo(() => {
    const groups = new Map<string, Report[]>();

    filtered.forEach((report) => {
      const key = report.iqaNumber || "Unassigned IQA";

      if (!groups.has(key)) {
        groups.set(key, []);
      }

      groups.get(key)!.push(report);
    });

    return Array.from(groups.entries())
      .map(([iqaNumber, groupReports]) => ({
        iqaNumber,
        reports: [...groupReports].sort((a, b) =>
          (a.iqrNumber || "").localeCompare(b.iqrNumber || "")
        ),
      }))
      .sort((a, b) =>
        (b.iqaNumber || "").localeCompare(a.iqaNumber || "")
      );
  }, [filtered]);

  const toggleIQA = (iqaNumber: string) => {
    setExpandedIQAs((previous) => ({
      ...previous,
      [iqaNumber]: !previous[iqaNumber],
    }));
  };

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
      const days = reportDaysOpen(r.reportCreatedOn || r.createdAt);
      return days !== null && days > 30;
    }).length;
  }, [filtered]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Open Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {filtered.length} active reports
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
      <FilterToolbar search={{ value: search, onChange: setSearch, placeholder: "Search open reports..." }}
          filters={[
            ...(search ? [{ key: "search", label: "Search", value: search, onRemove: () => setSearch("") }] : []),
            ...(filterReportId !== "" ? [{ key: "filterReportId", label: "IQR ID", value: filterReportId, onRemove: () => setFilterReportId("") }] : []),
            ...(!isManager && filterPrakalpa !== "All" ? [{ key: "filterPrakalpa", label: "Prakalpa", value: filterPrakalpa, onRemove: () => setFilterPrakalpa("All") }] : []),
            ...(filterClassification !== "All" ? [{ key: "filterClassification", label: "Classification", value: filterClassification, onRemove: () => setFilterClassification("All") }] : []),
            ...(filterCoordinator !== "All" ? [{ key: "filterCoordinator", label: "Coordinator", value: filterCoordinator, onRemove: () => setFilterCoordinator("All") }] : [])
          ]}
          onClearAll={clearFilters} resultCount={filtered.length} resultLabel="open reports shown">
          <FilterText label="IQR ID" value={filterReportId} onChange={setFilterReportId} placeholder="Partial IQR ID" />
          {!isManager && <FilterSelect label="Prakalpa" value={filterPrakalpa} onChange={setFilterPrakalpa} options={filterPrakalpaOptions.map(value => ({ value, label: value }))} searchable allLabel="All Prakalpas" />}
          <FilterSelect label="Classification" value={filterClassification} onChange={setFilterClassification} options={[{ value: "NC", label: "NC" }, { value: "OFI", label: "OFI" }]} allLabel="All Types" />
          <FilterSelect label="Coordinator" value={filterCoordinator} onChange={setFilterCoordinator} options={filterCoordinatorOptions.map(value => ({ value, label: value }))} searchable allLabel="All Coordinators" />
        </FilterToolbar>

      {/* Open Reports grouped by IQA */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4 text-center">
          <span className="material-symbols-outlined text-[48px] text-secondary/40">
            check_circle
          </span>

          <p className="font-headline-sm text-on-surface-variant/40">
            No open reports found
          </p>

          <p className="font-body-md text-on-surface-variant/30">
            All clear!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedOpenReports.map((group) => {
            const first = group.reports[0];

            const ncInGroup = group.reports.filter(
              (report) => report.severity === "non_conformance"
            ).length;

            const ofiInGroup = group.reports.filter(
              (report) => report.severity === "open_for_improvement"
            ).length;

            const oldestDays = Math.max(
              ...group.reports.map((report) =>
                reportDaysOpen(report.reportCreatedOn || report.createdAt) ?? 0
              )
            );

            const expanded = !!expandedIQAs[group.iqaNumber];
            const reviewCount = isCoordinator ? group.reports.filter(r => r.workflowStatus === "action_submitted").length : 0;

            return (
              <div
                key={group.iqaNumber}
                className={`bg-white rounded-xl border shadow-soft overflow-hidden ${
                  oldestDays > 30
                    ? "border-error/30"
                    : "border-outline-variant/10"
                }`}
              >
                {/* IQA Summary Row */}
                <button title="Notify about report created"
                  type="button"
                  onClick={() => toggleIQA(group.iqaNumber)}
                  className="w-full p-4 sm:p-5 text-left hover:bg-surface-container-lowest transition-colors"
                >
                  <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                    <div className="flex items-start gap-3 min-w-[230px]">
                      <span className="material-symbols-outlined text-primary mt-0.5">
                        {expanded
                          ? "keyboard_arrow_down"
                          : "keyboard_arrow_right"}
                      </span>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-data-mono font-bold text-primary text-sm">
                            {group.iqaNumber}
                          </span>

                          {reviewCount > 0 && <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900" title="Click to expand IQRs awaiting review">{reviewCount} Needs Review</span>}
                          {oldestDays > 30 && (
                            <span
                              className="material-symbols-outlined text-error text-[17px]"
                              title="Contains report open for more than 30 days"
                            >
                              flag
                            </span>
                          )}
                        </div>

                        <p className="font-body-sm text-on-surface-variant mt-1">
                          {group.reports.length} open IQR
                          {group.reports.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-label-md">
                          Prakalpa
                        </p>
                        <p className="font-label-md font-semibold text-on-surface mt-1">
                          {first?.prakalpa || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-label-md">
                          Location
                        </p>
                        <p className="font-label-md font-semibold text-on-surface mt-1">
                          {first?.location || "—"}
                          {first?.sublocation
                            ? ` / ${first.sublocation}`
                            : ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-label-md">
                          Coordinator
                        </p>
                        <p className="font-label-md font-semibold text-on-surface mt-1">
                          {first?.auditCoordinator || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-label-md">
                          Open Findings
                        </p>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full bg-error/10 text-error text-[10px] font-bold">
                            {ncInGroup} NC
                          </span>

                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            {ofiInGroup} OFI
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 xl:justify-end">
                      <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase whitespace-nowrap">
                        Open
                      </span>

                      {isCoordinator && (group.reports.every((report) => report.mailSent) ? (
                        <span
                          className="inline-flex items-center justify-center rounded-full w-10 h-10 bg-blue-50 border border-blue-300 text-blue-600 shadow-sm"
                          title="Sent Email Successfully"
                          aria-label="Sent Email Successfully"
                        >
                          <span className="material-symbols-outlined text-[21px]">
                            mark_email_read
                          </span>
                        </span>
                      ) : (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSendIQAEmail(group.iqaNumber);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              handleSendIQAEmail(group.iqaNumber);
                            }
                          }}
                          className="inline-flex items-center justify-center rounded-full w-10 h-10 bg-amber-50 border border-amber-300 text-amber-600 shadow-sm hover:bg-amber-100 hover:shadow-md transition-all cursor-pointer"
                          title="Send Email"
                          aria-label="Send Email"
                        >
                          <span className="material-symbols-outlined text-[21px]">
                            mail
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </button>

                {/* Child IQRs */}
                {expanded && (
                  <div className="border-t border-outline-variant/10 bg-surface-container-lowest">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[1050px] text-left">
                        <thead className="bg-surface-container-low">
                          <tr>
                            {[
                              "IQR Number",
                              "Auditor",
                              "Audit Date",
                              "Finding",
                              "Type",
                              "Days Open",
                              "Actions",
                            ].map((heading) => (
                              <th
                                key={heading}
                                className="px-4 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[10px]"
                              >
                                {heading}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-outline-variant/10">
                          {group.reports.map((report) => {
                            const days = reportDaysOpen(report.reportCreatedOn || report.createdAt) ?? 0;

                            const assignedAuditors =
                              report.auditors &&
                              report.auditors.length > 0
                                ? report.auditors.join(", ")
                                : report.auditor || "—";

                            return (
                              <tr
                                key={report._id}
                                onClick={() => handleViewReport(report)}
                                className={`cursor-pointer transition-colors hover:bg-white ${
                                  days > 30 ? "bg-error/5" : "bg-white/70"
                                }`}
                              >
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    {days > 30 && (
                                      <span
                                        className="material-symbols-outlined text-error text-[15px]"
                                        title="Open for more than 30 days"
                                      >
                                        flag
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleViewReport(report);
                                      }}
                                      className="font-data-mono text-primary font-bold text-[12px] hover:underline"
                                    >
                                      {report.iqrNumber}
                                    </button>
                                  </div>
                                </td>

                                <td className="px-4 py-3 font-body-md text-on-surface-variant text-[12px]">
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-secondary">
                                      badge
                                    </span>
                                    {assignedAuditors}
                                  </div>
                                </td>

                                <td className="px-4 py-3 font-data-mono text-[11px] whitespace-nowrap">
                                  {report.visitDate
                                    ? new Date(
                                        report.visitDate
                                      ).toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "numeric",
                                      })
                                    : "—"}
                                </td>

                                <td className="px-4 py-3 max-w-[300px]">
                                  <p
                                    className="font-body-md text-[12px] text-on-surface truncate"
                                    title={report.findings}
                                  >
                                    {report.findings || "—"}
                                  </p>
                                </td>

                                <td className="px-4 py-3">
                                  {report.severity ===
                                  "non_conformance" ? (
                                    <span className="px-2.5 py-1 rounded-full bg-error/10 text-error font-bold text-[10px]">
                                      NC
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                                      OFI
                                    </span>
                                  )}
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
                                    {/* Manager: one icon only, based on this IQR's workflow status. */}
                                    {canSubmitAction(report) ? (
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleOpenActionDialog(report);
                                        }}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-700 transition-all hover:bg-amber-100 hover:shadow-sm"
                                        title={report.workflowStatus === "returned_to_prakalpa" ? "Revise and Resend Actions Taken" : "Send Actions Taken"}
                                        aria-label={report.workflowStatus === "returned_to_prakalpa" ? "Revise and Resend Actions Taken" : "Send Actions Taken"}
                                      >
                                        <span className="material-symbols-outlined text-[18px]">send</span>
                                      </button>
                                    ) : isManager && report.workflowStatus === "action_submitted" ? (
                                      <span
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 cursor-default"
                                        title="Awaiting Audit Coordinator Review"
                                        aria-label="Awaiting Audit Coordinator Review"
                                      >
                                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                                      </span>
                                    ) : null}

                                    {/* Coordinator: per-IQR action in Open Reports */}
                                    {isCoordinator && report.workflowStatus === "action_submitted" ? (
                                      <button type="button" onClick={(event) => { event.stopPropagation(); handleViewReport(report); }}
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                        title="Review Actions Taken / Verify & Close" aria-label={`Review ${report.iqrNumber}`}>
                                        <span className="material-symbols-outlined text-[18px]">task_alt</span>
                                      </button>
                                    ) : isCoordinator && ["sent_to_prakalpa", "returned_to_prakalpa"].includes(report.workflowStatus || "") ? (
                                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 cursor-default"
                                        title="Waiting for Prakalpa Actions Taken" aria-label={`Waiting for ${report.iqrNumber}`}>
                                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                                      </span>
                                    ) : null}

                                    {/* View */}
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleViewReport(report);
                                      }}
                                      className="p-2 rounded-lg transition-all hover:scale-110 hover:bg-primary/10 text-primary"
                                      title="View Report Details"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        open_in_new
                                      </span>
                                    </button>

                                    {/* PDF */}
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
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
                  </div>
                )}
              </div>
            );
          })}

          <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-4 flex flex-wrap justify-between items-center gap-3 font-label-md text-on-surface-variant">
            <span>
              Showing <strong>{groupedOpenReports.length}</strong> IQA
              {groupedOpenReports.length !== 1 ? "s" : ""} containing{" "}
              <strong>{filtered.length}</strong> open IQR
              {filtered.length !== 1 ? "s" : ""}
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

              {/* pratibimba-iqr-history-v1: complete IQR event timeline */}
              {!!detailTarget.workflowHistory?.length && <div className="space-y-3">
                <button type="button" onClick={() => setShowIqrHistory(v => !v)} aria-expanded={showIqrHistory} className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5">{showIqrHistory ? "Hide History" : "View History"} ({detailTarget.workflowHistory.length} events)</button>
                {showIqrHistory && <div className="space-y-3 rounded-xl border p-4">
                  <h3 className="font-semibold">Corrective Action and Coordinator Review History</h3>
                  {[...detailTarget.workflowHistory].sort((a,b) => new Date(a.performedAt || 0).getTime() - new Date(b.performedAt || 0).getTime()).map((entry,index) => <div key={`${entry.performedAt || "event"}-${index}`} className="rounded-lg border bg-white p-3 space-y-2">
                    <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{entry.action === "action_submitted" ? "Actions Taken Submitted" : entry.action === "returned_to_prakalpa" ? "Returned for Correction" : entry.action.replace(/_/g," ")}</strong><span className="text-xs text-on-surface-variant">{entry.performedAt ? new Date(entry.performedAt).toLocaleString("en-IN") : "Date unavailable"}</span></div>
                    <p className="text-xs text-on-surface-variant">{entry.performedBy || "User"}</p>
                    {entry.action === "action_submitted" && (entry.actionTakenSnapshot ? <p className="whitespace-pre-wrap text-sm"><strong>Actions Taken: </strong>{entry.actionTakenSnapshot}</p> : <p className="text-xs text-on-surface-variant">Original Actions Taken text was not saved in this older event.</p>)}
                    {entry.completionRemarksSnapshot && <p className="whitespace-pre-wrap text-sm"><strong>Completion Remarks: </strong>{entry.completionRemarksSnapshot}</p>}
                    {!!entry.actionProofFilesSnapshot?.length && <div className="text-sm"><strong>Evidence: </strong>{entry.actionProofFilesSnapshot.map((token,i) => <button type="button" key={`${token}-${i}`} onClick={() => void downloadReportActionProof(detailTarget._id,token)} className="ml-2 text-primary underline">Proof {i+1}</button>)}</div>}
                    {entry.remarks && <p className="whitespace-pre-wrap text-sm"><strong>{entry.action === "returned_to_prakalpa" ? "Coordinator Remarks" : "Remarks"}: </strong>{entry.remarks}</p>}
                  </div>)}
                </div>}
              </div>}
              {/* Corrective Action Details if present */}
              {detailTarget.actionTaken && (
                <div>
                  <p className="font-semibold text-on-surface mb-2">
                    Current Actions Taken (Latest)
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

              {/* Coordinator verification is per-IQR; actions only become available after submission. */}
              {isCoordinator && detailTarget.workflowStatus === "action_submitted" && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                  <h3 className="font-semibold text-emerald-900">Review Actions Taken — {detailTarget.iqrNumber}</h3>
                  <p className="text-sm text-emerald-900">Review the submitted corrective action and proof above before closing or returning this IQR.</p>
                  <label htmlFor="open-report-verification-remarks" className="block text-sm font-semibold">Coordinator Remarks</label>
                  <textarea id="open-report-verification-remarks" value={verificationRemarks} onChange={(e) => setVerificationRemarks(e.target.value)} rows={3}
                    disabled={processingVerification} placeholder="Required when returning for correction" className="w-full rounded-lg border border-emerald-200 p-3 text-sm" />
                  <div className="flex flex-wrap justify-end gap-3">
                    <button type="button" disabled={processingVerification} onClick={() => setWorkflowConfirm("return")}
                      className="rounded-lg border border-amber-400 px-4 py-2 text-amber-800 disabled:opacity-50">Return to Prakalpa Manager</button>
                    <button type="button" disabled={processingVerification} onClick={() => setWorkflowConfirm("close")}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-white disabled:opacity-50">Verify &amp; Close IQR</button>
                  </div>
                </div>
              )}
              {isCoordinator && ["sent_to_prakalpa", "returned_to_prakalpa"].includes(detailTarget.workflowStatus || "") && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Waiting for Prakalpa Actions Taken. Verification is unavailable for this IQR.</p>
              )}

              {/* Evidence Files Section */}
              {!!detailTarget.actionProofFiles?.length && <div className="space-y-2"><p className="font-semibold">Corrective-Action Proof</p>{detailTarget.actionProofFiles.map((token, index) => <button key={token} type="button" className="block text-sm text-primary underline" onClick={() => void downloadReportActionProof(detailTarget._id, token)}>View action proof {index + 1}</button>)}</div>}
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
                {canSubmitAction(detailTarget) && (
                  <button
                    onClick={() => handleOpenActionDialog(detailTarget)}
                    className="px-5 py-2 bg-error text-white rounded-lg font-bold hover:brightness-110 transition-all font-label-md"
                  >
                    Submit Corrective Action
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

      {workflowConfirm && detailTarget && isCoordinator && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Coordinator confirmation">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain">
            <h3 className="text-lg font-bold text-on-surface">{workflowConfirm === "return" ? "Return to Prakalpa Manager?" : `Verify & Close ${detailTarget.iqrNumber}?`}</h3>
            <p className="text-sm text-on-surface-variant">{workflowConfirm === "return" ? `Return ${detailTarget.iqrNumber} to the Prakalpa Manager for correction? The IQR will remain open and your remarks will be saved.` : `Verify the submitted Actions Taken and formally close ${detailTarget.iqrNumber}? Only this IQR will be closed.`}</p>
            {workflowConfirm === "return" && !verificationRemarks.trim() && <p className="text-sm text-error">Coordinator remarks are required to return an IQR.</p>}
            <div className="flex justify-end gap-3">
              <button type="button" disabled={processingVerification} onClick={() => setWorkflowConfirm(null)} className="rounded-lg border border-outline-variant px-4 py-2">Cancel</button>
              <button type="button" disabled={processingVerification || (workflowConfirm === "return" && !verificationRemarks.trim())}
                onClick={async () => { const operation = workflowConfirm; setWorkflowConfirm(null); if (operation === "return") await handleCoordinatorReturn(); else await handleCoordinatorClose(); }}
                className="rounded-lg bg-primary px-4 py-2 text-white disabled:opacity-50">{processingVerification ? "Processing..." : workflowConfirm === "return" ? "Confirm Return" : "Confirm & Close IQR"}</button>
            </div>
          </div>
        </div>
      )}

      {workflowNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-label={workflowNotice.title}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 text-center">
            <span className={`material-symbols-outlined text-[42px] ${workflowNotice.kind === "success" ? "text-emerald-700" : "text-error"}`}>{workflowNotice.kind === "success" ? "check_circle" : "error"}</span>
            <h3 className="text-lg font-bold text-on-surface">{workflowNotice.title}</h3>
            <p className="text-sm text-on-surface-variant">{workflowNotice.message}</p>
            <button type="button" onClick={() => setWorkflowNotice(null)} className="rounded-lg bg-primary px-6 py-2 text-white">OK</button>
          </div>
        </div>
      )}

      {/* Corrective Action Submission Dialog */}
      {actionTarget && isManager && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setActionTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10 p-6 space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain">
            <div className="border-b border-outline-variant/10 pb-3">
              <h3 className="font-headline-sm text-on-surface">
                {actionTarget.workflowStatus === "returned_to_prakalpa" ? "Update & Resubmit Corrective Action" : "Submit Corrective Action"} — {actionTarget.iqrNumber}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 font-body-md">
                Please enter the corrective action taken for this audit finding.
              </p>
            </div>

              {actionTarget.workflowStatus === "returned_to_prakalpa" && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2" role="note">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                    <span className="material-symbols-outlined text-[19px]">feedback</span>
                    Audit Coordinator's Return Remarks
                  </div>
                  <p className="text-sm text-amber-950 whitespace-pre-wrap">{actionTarget.coordinatorVerificationRemarks?.trim() || "The Coordinator returned this IQR for correction, but no return remarks were included in the report response. Contact the Audit Coordinator if clarification is needed."}</p>
                  <p className="text-xs text-amber-800">Review this feedback, update Actions Taken, and resubmit for verification.</p>
                </div>
              )}

            {/* Audit Finding Card */}
            <div className="rounded-lg bg-surface-container-low p-3 border border-outline-variant/20">
              <p className="text-xs font-semibold text-on-surface mb-1 font-label-md">
                Audit Finding
              </p>
              <p className="text-sm whitespace-pre-wrap font-body-md text-on-surface-variant leading-relaxed">
                {actionTarget.findings}
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

            <div className="space-y-2">
              <label className="block text-xs font-label-md font-semibold text-on-surface-variant">Supporting Proof (Optional — PDF, PNG, JPEG or WebP, max 8 MB)</label>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low/40 px-4 py-5 text-center hover:border-primary/60 hover:bg-primary/5">
                <span className="material-symbols-outlined text-[28px] text-primary">cloud_upload</span>
                <span className="text-sm font-semibold text-on-surface">{actionProof ? actionProof.name : "Choose supporting evidence"}</span>
                <span className="text-xs text-on-surface-variant">{actionProof ? `${(actionProof.size / 1024 / 1024).toFixed(2)} MB selected` : "PDF, PNG, JPEG or WebP · Max 8 MB"}</span>
                <span className="rounded-lg border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary">Browse File</span>
                <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    if (file && (file.size > 8 * 1024 * 1024 || !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type))) {
                      setActionProof(null); setActionProofError("Select a PDF, PNG, JPEG or WebP file of at most 8 MB."); e.target.value = ""; return;
                    }
                    setActionProof(file); setActionProofError("");
                  }} />
              </label>
              {actionProof && <button type="button" onClick={() => setActionProof(null)} className="text-xs text-error underline">Remove selected file</button>}
              {actionProofError && <p className="text-xs text-error" role="alert">{actionProofError}</p>}
              {!!actionTarget.actionProofFiles?.length && <div className="space-y-1"><p className="text-xs font-semibold">Previously uploaded action proof</p>{actionTarget.actionProofFiles.map((token, index) => <button key={token} type="button" className="block text-xs text-primary underline" onClick={() => void downloadReportActionProof(actionTarget._id, token)}>View action proof {index + 1}</button>)}</div>}
            </div>

            {/* Confirmation Banner */}
            <div className="rounded-lg border border-error/20 bg-error/5 p-3">
              <div className="flex gap-2.5 items-start">
                <span className="material-symbols-outlined text-error text-[20px] mt-0.5">
                  warning
                </span>
                <div>
                  <p className="font-semibold text-error text-xs font-label-md">
                    Submit Corrective Action
                  </p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5 leading-normal font-body-md">
                    Once submitted, the corrective action will be sent for verification. The IQR will remain open until it is verified and formally closed.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/10">
              <button
                type="button"
                onClick={() => setActionTarget(null)}
                className="px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!actionTaken.trim() || closing}
                onClick={() => setConfirmAction(true)}
                className="px-5 py-2 rounded-lg bg-error text-white font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center gap-2 font-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">
                  task_alt
                </span>
                {closing ? "Submitting..." : "Confirm & Send to Audit Coordinator"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app confirmation: never submit evidence or action before confirmation. */}
      {confirmAction && actionTarget && isManager && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Confirm corrective action submission">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain">
            <h3 className="font-bold text-lg">Confirm & Send Actions Taken</h3>
            <p className="text-sm">Submit Actions Taken for {actionTarget.iqrNumber} to the Audit Coordinator? You cannot edit this IQR after submission unless the Coordinator returns it for correction.</p>
            <div className="flex justify-end gap-3">
              <button type="button" disabled={closing} onClick={() => setConfirmAction(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button type="button" disabled={closing || !actionTaken.trim()} onClick={handleSubmitCorrectiveAction} className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-50">{closing ? "Sending..." : "Confirm & Send"}</button>
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
              Actions Taken Submitted Successfully
            </h3>

            <p className="text-on-surface-variant text-sm font-body-md mb-6 leading-relaxed">
              {lastSubmittedNumber ? `${lastSubmittedNumber} has been sent to the Audit Coordinator for review. ` : ""}
              The IQR remains open until the Audit Coordinator verifies and formally closes it.
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
      {iqaMailTarget && iqaMailDraft && (
        <SendScheduledAuditEmailModal
          audit={{
            _id:
              iqaMailTarget._id ||
              iqaMailTarget.id,
            id: iqaMailTarget.id,
            iqaNumber:
              iqaMailTarget.iqaNumber,
            prakalpa:
              iqaMailTarget.prakalpa,
            location:
              iqaMailTarget.location,
            sublocation:
              iqaMailTarget.sublocation,
            startDate:
              iqaMailTarget.startDate,
            endDate:
              iqaMailTarget.endDate,
            auditCoordinator:
              iqaMailTarget.auditCoordinator,
          }}
          mode="iqa-report"
          initialTo={iqaMailDraft.to}
          initialCc={iqaMailDraft.cc}
          initialSubject={iqaMailDraft.subject}
          initialMessage={iqaMailDraft.message}
          attachments={iqaMailDraft.attachments}
          onClose={() => {
            setIqaMailTarget(null);
            setIqaMailDraft(null);
          }}
          onSent={async () => {
            await Promise.all([
              loadScheduledAudits(),
              loadReports(),
            ]);
          }}
        />
      )}

    </div>
  );
}