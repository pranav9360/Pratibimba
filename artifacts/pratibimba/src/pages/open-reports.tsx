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
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [closing, setClosing] = useState(false);

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
    const audit = scheduledAudits.find(
      (item) => item.iqaNumber === iqaNumber
    );

    if (!audit) {
      alert(
        `Unable to prepare email because scheduled audit ${iqaNumber} was not found.`
      );
      return;
    }

    const auditId = audit._id || audit.id;

    if (!auditId) {
      alert("Unable to identify the scheduled audit.");
      return;
    }

    const groupReports = reports.filter(
      (report) => report.iqaNumber === iqaNumber
    );

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
  };

  const handleDownload = async (report: Report) => {
    try {
      await downloadReportPDF(report._id);
    } catch (error) {
      console.error("Error downloading report PDF:", error);
    }
  };

  const handleOpenActionDialog = (report: Report) => {
    setActionTarget(report);
    setActionTaken("");
    setCompletionRemarks("");
  };

  const handleSubmitCorrectiveAction = async () => {
    if (!actionTarget || !actionTaken.trim()) return;

    setClosing(true);
    const iqrNum = actionTarget.iqrNumber;

    try {
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
      alert(
        "Unable to submit corrective action. Please try again."
      );
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
                Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(report.createdAt).getTime()) /
                      86400000
                  )
                )
              )
            );

            const expanded = !!expandedIQAs[group.iqaNumber];

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
                <button
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
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-white text-[11px] font-bold hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
                        title={
                          scheduledAudits.find(
                            (audit) => audit.iqaNumber === group.iqaNumber
                          )?.mailSent
                            ? "Resend IQA Email"
                            : "Send IQA Email"
                        }
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {scheduledAudits.find(
                            (audit) => audit.iqaNumber === group.iqaNumber
                          )?.mailSent
                            ? "mark_email_read"
                            : "mail"}
                        </span>

                        {scheduledAudits.find(
                          (audit) =>
                            audit.iqaNumber === group.iqaNumber
                        )?.mailSent
                          ? "Resend Email"
                          : "Send Email"}
                      </span>
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
                            const days = Math.max(
                              0,
                              Math.floor(
                                (Date.now() -
                                  new Date(report.createdAt).getTime()) /
                                  86400000
                              )
                            );

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
                                    {/* Close */}
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleOpenActionDialog(report);
                                      }}
                                      className="p-2 rounded-lg transition-all hover:scale-110 hover:bg-error/10 text-error"
                                      title="Submit Corrective Action"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        task_alt
                                      </span>
                                    </button>

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

      {/* Corrective Action Submission Dialog */}
      {actionTarget && (
        <div className="fixed inset-0 flex items-center justify-center z-[60] p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setActionTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10 p-6 space-y-4">
            <div className="border-b border-outline-variant/10 pb-3">
              <h3 className="font-headline-sm text-on-surface">
                Submit Corrective Action — {actionTarget.iqrNumber}
              </h3>
              <p className="text-xs text-on-surface-variant mt-1 font-body-md">
                Please enter the corrective action taken for this audit finding.
              </p>
            </div>

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
                onClick={handleSubmitCorrectiveAction}
                className="px-5 py-2 rounded-lg bg-error text-white font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center gap-2 font-label-md"
              >
                <span className="material-symbols-outlined text-[18px]">
                  task_alt
                </span>
                {closing ? "Submitting..." : "Submit Action"}
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
              {lastSubmittedNumber ? `${lastSubmittedNumber} has been closed. ` : ""}
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