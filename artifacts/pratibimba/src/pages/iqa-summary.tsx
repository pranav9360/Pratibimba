import { useState, useMemo, useEffect, Fragment } from "react";
import { PRAKALPAS, AUDIT_COORDINATORS } from "../context/app-context";
import { getReports } from "../services/reportService";
import { getAuditPlans } from "../services/auditPlanService";

function downloadCSV(
  rows: Array<{ report: any; reports: any[] }>,
  getDaysOpen: (r: any) => number
) {
  const headers = [
    "Audit ID",
    "Prakalpa",
    "Location",
    "Sublocation",
    "Audit Planned Date",
    "Audit Coordinator",
    "Audit Start Date",
    "Audit End Date",
    "Audit Days",
    "Auditors",
    "Audit Areas",
    "Total Audit Findings",
    "Status",
    "Prakalpa Pramukh",
  ];
  const lines = rows.map(({ report, reports: r }) => {
    const ncIARs = r.filter((x) => x.severity === "non_conformance").length;
    const ofiIARs = r.filter((x) => x.severity === "open_for_improvement").length;
    const allClosed = r.length > 0 && r.every((x) => x.status === "closed");
    const status =
      allClosed
        ? "Completed"
        : "In Progress";

    const daysList = r.map(getDaysOpen);
    const auditDays = daysList.length > 0 ? Math.max(...daysList) : 0;



    return [
      report.iqaNumber,
      report.prakalpa,
      report.location || "",
      report.sublocation || "",
      report.visitDate || "",
      report.auditCoordinator || "",
      report.visitDate || "",
      report.visitDate || "",
      auditDays,
      (report.auditors || []).join("; "),
      (report.auditAreas || []).join("; "),
      r.length,
      status,
      report.prakalphaPramukh || "",
    ]
      .map(String)
      .join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IQA_Summary_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function IQASummaryPage() {
  const [auditPlans, setAuditPlans] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPramukh, setFilterPramukh] = useState("");
  const [filterAuditArea, setFilterAuditArea] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [auditPlanData, reportData] = await Promise.all([
        getAuditPlans(),
        getReports(),
      ]);

      setAuditPlans(auditPlanData);
      setReports(reportData);
    } catch (err) {
      console.error("Failed to load IQA Summary", err);
    }
  };

  // Days Open calculation comparing normalized midnight dates
  const getDaysOpen = (report: any) => {
    const start = new Date(report.reportCreatedOn || report.createdAt);
    const end =
      report.status === "closed" && (report.reportClosedOn || report.closedAt)
        ? new Date(report.reportClosedOn || report.closedAt)
        : new Date();

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Red flag indicator check
  const isRedFlagged = (report: any) => {
    return report.status === "open" && getDaysOpen(report) >= 30;
  };

  // STEP 1: Replace summaryRows by grouping reports directly on report.iqaNumber
  const summaryRows = useMemo(() => {
    const grouped = reports.reduce((acc: any, report: any) => {
      if (!acc[report.iqaNumber]) {
        acc[report.iqaNumber] = [];
      }
      acc[report.iqaNumber].push(report);
      return acc;
    }, {});

    return Object.values(grouped).map((group: any) => {
      const firstReport = group[0];
      return {
        report: firstReport,
        reports: group,
      };
    });
  }, [reports]);

  // STEP 12: Locations derived directly from report objects in summaryRows
  const allLocations = useMemo(() => {
    const s = new Set<string>();
    summaryRows.forEach(({ report }) => {
      if (report.location) s.add(report.location);
    });
    return Array.from(s);
  }, [summaryRows]);

  // STEP 12: Audit Areas derived from summaryRows
  const allAuditAreas = useMemo(() => {
    const s = new Set<string>();
    summaryRows.forEach(({ report }) => {
      (report.auditAreas || []).forEach((area: string) => s.add(area));
    });
    return Array.from(s);
  }, [summaryRows]);

  const getAuditStatus = (r: any[]) => {
    if (
      r.length > 0 &&
      r.every((x) => x.status === "closed")
    ) {
      return {
        label: "Completed",
        style: "bg-secondary/10 text-secondary",
      };
    }

    return {
      label: "In Progress",
      style: "bg-primary/10 text-primary",
    };
  };

  // STEP 2 & 3: Filter logic updated to evaluate 'report' fields
  const filtered = useMemo(() => {
    return summaryRows.filter(({ report, reports: r }) => {
      const { label: statusLabel } = getAuditStatus(r);
      const matchSearch =
        !search ||
        report.iqaNumber.toLowerCase().includes(search.toLowerCase()) ||
        report.prakalpa.toLowerCase().includes(search.toLowerCase()) ||
        (report.prakalphaPramukh || "")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || report.prakalpa === filterPrakalpa;
      const matchLocation = filterLocation === "All" || report.location === filterLocation;
      const matchCoord =
        filterCoordinator === "All" || report.auditCoordinator === filterCoordinator;
      const matchStatus =
        filterStatus === "All" || statusLabel.toLowerCase() === filterStatus.toLowerCase();
      const matchPramukh =
        !filterPramukh ||
        (report.prakalphaPramukh || "")
          .toLowerCase()
          .includes(filterPramukh.toLowerCase()); // STEP 10: Pramukh fallback
      const matchArea =
        filterAuditArea === "All" ||
        (report.auditAreas || []).includes(filterAuditArea);
      return (
        matchSearch &&
        matchPrakalpa &&
        matchLocation &&
        matchCoord &&
        matchStatus &&
        matchPramukh &&
        matchArea
      );
    });
  }, [
    summaryRows,
    search,
    filterPrakalpa,
    filterLocation,
    filterCoordinator,
    filterStatus,
    filterPramukh,
    filterAuditArea,
  ]);

  const clearFilters = () => {
    setSearch("");
    setFilterPrakalpa("All");
    setFilterLocation("All");
    setFilterCoordinator("All");
    setFilterStatus("All");
    setFilterPramukh("");
    setFilterAuditArea("All");
  };

  const hasFilters =
    search ||
    filterPrakalpa !== "All" ||
    filterLocation !== "All" ||
    filterCoordinator !== "All" ||
    filterStatus !== "All" ||
    filterPramukh ||
    filterAuditArea !== "All";

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">IQA Summary</h2>
          {/* STEP 11: Header Count */}
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {summaryRows.length} IQAs · {reports.length} reports · {auditPlans.length} pending plans
          </p>
        </div>
        <button
          onClick={() => downloadCSV(filtered, getDaysOpen)}
          className="flex items-center gap-2 px-4 py-2.5 bg-secondary text-on-secondary rounded-lg font-label-md font-bold hover:brightness-110 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download IQA Summary
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-full sm:flex-1 sm:min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search Audit ID, Prakalpa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest"
            />
          </div>
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
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          >
            <option value="All">All Locations</option>
            {allLocations.map((l) => (
              <option key={l}>{l}</option>
            ))}
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          >
            <option value="All">All Status</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Prakalpa Pramukh"
            value={filterPramukh}
            onChange={(e) => setFilterPramukh(e.target.value)}
            className="w-full sm:w-44 border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          />
          <select
            value={filterAuditArea}
            onChange={(e) => setFilterAuditArea(e.target.value)}
            className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none"
          >
            <option value="All">All Audit Areas</option>
            {allAuditAreas.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-left text-[12px]">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
              <tr>
                {[
                  "Audit ID",
                  "Prakalpa",
                  "Location",
                  "Sublocation",
                  "Planned Date",
                  "Coordinator",
                  "Start Date",
                  "End Date",
                  "Days",
                  "Auditors",
                  "Areas",                  "Findings",
                  "Status",
                  "Pramukh",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={15}
                    className="px-4 py-16 text-center font-body-md text-on-surface-variant/50"
                  >
                    No audits found
                  </td>
                </tr>
              ) : (
                filtered.map(({ report, reports: auditReports }, idx) => {
                  const statusBadge = getAuditStatus(auditReports);
                  const ncIARs = auditReports.filter(
                    (r: any) => r.severity === "non_conformance"
                  ).length;
                  const ofiIARs = auditReports.filter(
                    (r: any) => r.severity === "open_for_improvement"
                  ).length;
                  const hasFlag = auditReports.some(isRedFlagged);
                  const allClosed =
                    auditReports.length > 0 &&
                    auditReports.every((r: any) => r.status === "closed");

                  // STEP 5: Max days open calculated across group
                  const daysList = auditReports.map(getDaysOpen);
                  const auditDays = daysList.length > 0 ? Math.max(...daysList) : 0;

                  const isExpanded = expandedId === report.iqaNumber;

                  // STEP 7: Auditor list mapping
                  const auditorList = report.auditors || [];



                  return (
                    <Fragment key={report.iqaNumber || idx}>
                      <tr
                        onClick={() =>
                          setExpandedId(isExpanded ? null : report.iqaNumber)
                        }
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? "border-l-4 border-primary bg-primary/5"
                            : idx % 2 === 1
                            ? "bg-surface-container-lowest/50 hover:bg-surface-container-low"
                            : "hover:bg-surface-container-low"
                        }`}
                      >
                        {/* STEP 3: Audit ID -> report.iqaNumber */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {hasFlag && (
                              <span className="material-symbols-outlined text-error text-[13px]">
                                flag
                              </span>
                            )}
                            <span className="font-data-mono text-[11px] text-primary font-bold">
                              {report.iqaNumber}
                            </span>
                          </div>
                        </td>

                        {/* Prakalpa */}
                        <td className="px-3 py-3">
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold whitespace-nowrap">
                            {report.prakalpa}
                          </span>
                        </td>

                        {/* Location */}
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">
                          {report.location || "—"}
                        </td>

                        {/* Sublocation */}
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">
                          {report.sublocation || "—"}
                        </td>

                        {/* STEP 4: Planned Date -> report.visitDate */}
                        <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {report.visitDate
                            ? new Date(report.visitDate).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )
                            : "—"}
                        </td>

                        {/* Coordinator */}
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">
                          {report.auditCoordinator || "—"}
                        </td>

                        {/* STEP 4: Start Date -> report.visitDate */}
                        <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {report.visitDate
                            ? new Date(report.visitDate).toLocaleDateString(
                                "en-IN",
                                { day: "2-digit", month: "short", year: "2-digit" }
                              )
                            : "—"}
                        </td>

                        {/* STEP 4: End Date -> report.visitDate */}
                        <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {report.visitDate
                            ? new Date(report.visitDate).toLocaleDateString(
                                "en-IN",
                                { day: "2-digit", month: "short", year: "2-digit" }
                              )
                            : "—"}
                        </td>

                        {/* STEP 5: Audit Days */}
                        <td className="px-3 py-3 font-data-mono font-bold text-on-surface text-center">
                          {auditDays}
                        </td>

                        {/* STEP 7: Auditors */}
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {auditorList.slice(0, 2).map((a: string) => (
                              <span key={a} className="text-[10px]">
                                {a}
                              </span>
                            ))}
                            {auditorList.length > 2 && (
                              <span className="text-[9px] text-on-surface-variant/60">
                                +{auditorList.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STEP 8: Audit Areas */}
                        <td className="px-3 py-3 max-w-[120px]">
                          <div className="flex flex-wrap gap-1">
                            {(report.auditAreas || []).slice(0, 2).map((area: string) => (
                              <span
                                key={area}
                                className="px-1 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold whitespace-nowrap"
                              >
                                {area}
                              </span>
                            ))}

                            {(report.auditAreas || []).length > 2 && (
                              <span className="text-[9px] text-on-surface-variant">
                                +{report.auditAreas.length - 2}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total Findings */}
                        <td className="px-3 py-3 font-data-mono font-bold text-center text-on-surface">
                          {auditReports.length}
                        </td>

                        {/* Status Badge */}
                        <td className="px-3 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusBadge.style}`}
                          >
                            {statusBadge.label}
                          </span>
                        </td>

                        {/* STEP 10: Prakalpa Pramukh */}
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">
                          {report.prakalphaPramukh || "—"}
                        </td>

                        {/* Expand Chevron */}
                        <td className="px-3 py-3 text-on-surface-variant/50">
                          <span
                            className="material-symbols-outlined text-[18px] transition-transform"
                            style={{
                              transform: isExpanded ? "rotate(180deg)" : "none",
                            }}
                          >
                            expand_more
                          </span>
                        </td>
                      </tr>

                      {/* STEP 13: Expanded Cards Area for real backend reports */}
                      {isExpanded && (
                        <tr
                          key={`${report.iqaNumber}-expand`}
                          className="bg-surface-container-lowest/80"
                        >
                          <td
                            colSpan={15}
                            className="px-6 py-4 border-b border-outline-variant/20"
                          >
                            <div className="space-y-3">
                              {/* STEP 9: Sublocation display */}
                              <div className="flex flex-wrap gap-4 font-body-md text-on-surface-variant text-[12px]">

                                {report.purpose && (
                                  <span>
                                    <strong className="text-on-surface">
                                      Purpose:
                                    </strong>{" "}
                                    {report.purpose}
                                  </span>
                                )}

                                {report.sublocation && (
                                  <span>
                                    <strong className="text-on-surface">
                                      Sublocation:
                                    </strong>{" "}
                                    {report.sublocation}
                                  </span>
                                )}

                              </div>

                              {auditReports.length === 0 ? (
                                <p className="font-label-md text-on-surface-variant/50 italic">
                                  No reports filed for this audit yet.
                                </p>
                              ) : (
                                <div className="space-y-2">
                                  {auditReports.map((rp: any) => {
                                    const flagged = isRedFlagged(rp);
                                    return (
                                      <div
                                        key={rp._id}
                                        className={`flex flex-col gap-2 p-3 rounded-lg border ${
                                          flagged
                                            ? "border-error/30 bg-error/5"
                                            : "border-outline-variant/20 bg-white"
                                        }`}
                                      >
                                        <div className="flex flex-wrap items-center gap-3">
                                          <div className="flex flex-col">

                                            <span className="font-data-mono text-[11px] font-bold text-primary">
                                              {rp.iqrNumber}
                                            </span>

                                            <span className="text-[9px] text-on-surface-variant">
                                              {rp.iqaNumber}
                                            </span>

                                          </div>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              rp.severity === "non_conformance"
                                                ? "bg-error/10 text-error"
                                                : "bg-primary/10 text-primary"
                                            }`}
                                          >
                                            {rp.severity === "non_conformance"
                                              ? "NC"
                                              : "OFI"}
                                          </span>
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                              rp.status === "open"
                                                ? "bg-primary/10 text-primary"
                                                : "bg-secondary/10 text-secondary"
                                            }`}
                                          >
                                            {rp.status}
                                          </span>
                                          <span className="font-label-md text-[11px] text-on-surface-variant/70">
                                            {rp.location || "—"}
                                          </span>
                                          {flagged && (
                                            <span className="text-error font-label-md font-bold text-[11px]">
                                              🚨 Red Flagged
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex-1 space-y-1">

                                          <div className="font-label-md text-on-surface text-[11px]">
                                            <strong>Finding:</strong>{" "}
                                            {rp.findings || "—"}
                                          </div>

                                          <div className="flex flex-wrap gap-4 text-[10px] text-on-surface-variant">

                                            <span>
                                              <strong>Created:</strong>{" "}
                                              {rp.reportCreatedOn
                                                ? new Date(rp.reportCreatedOn).toLocaleDateString("en-IN")
                                                : "—"}
                                            </span>

                                            <span>
                                              <strong>Closed:</strong>{" "}
                                              {rp.reportClosedOn
                                                ? new Date(rp.reportClosedOn).toLocaleDateString("en-IN")
                                                : "—"}
                                            </span>

                                            <span>
                                              <strong>Days Open:</strong>{" "}
                                              {getDaysOpen(rp)}
                                            </span>

                                          </div>
                                          <div className="flex flex-wrap gap-4 text-[10px] text-on-surface-variant">

                                            <span>
                                              <strong>Audit Areas:</strong>{" "}
                                              {(rp.auditAreas || []).join(", ") || "—"}
                                            </span>

                                            <span>
                                              <strong>Pramukh:</strong>{" "}
                                              {rp.prakalphaPramukh || "—"}
                                            </span>

                                            {rp.purpose && (
                                              <span>
                                                <strong>Purpose:</strong>{" "}
                                                {rp.purpose}
                                              </span>
                                            )}

                                          </div>
                                        </div>

                                        {/* Rich Backend Lifecycle Metadata Cards */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-outline-variant/10 text-[11px] text-on-surface-variant">
                                          <div>
                                            <span className="block text-[10px] text-on-surface-variant/60">
                                              Created
                                            </span>
                                            <span className="font-medium text-on-surface">
                                              {rp.reportCreatedOn || rp.createdAt
                                                ? new Date(
                                                    rp.reportCreatedOn || rp.createdAt
                                                  ).toLocaleDateString("en-IN")
                                                : "—"}
                                            </span>
                                          </div>

                                          <div>
                                            <span className="block text-[10px] text-on-surface-variant/60">
                                              Closed
                                            </span>
                                            <span className="font-medium text-on-surface">
                                              {rp.reportClosedOn || rp.closedAt
                                                ? new Date(
                                                    rp.reportClosedOn || rp.closedAt
                                                  ).toLocaleDateString("en-IN")
                                                : "—"}
                                            </span>
                                          </div>

                                          <div>
                                            <span className="block text-[10px] text-on-surface-variant/60">
                                              Closed By
                                            </span>
                                            <span className="font-medium text-on-surface">
                                              {rp.closedBy || "—"}
                                            </span>
                                          </div>

                                          <div>
                                            <span className="block text-[10px] text-on-surface-variant/60">
                                              Days Open
                                            </span>
                                            <span
                                              className={`font-semibold ${
                                                flagged
                                                  ? "text-error"
                                                  : "text-on-surface"
                                              }`}
                                            >
                                              {getDaysOpen(rp)} Days
                                            </span>
                                          </div>
                                        </div>
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

        {/* STEP 11: Footer Summary Counts */}
        <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant flex-wrap gap-2">
          <span>
            {filtered.length} of {summaryRows.length} IQAs shown
          </span>
          <div className="flex gap-4 text-[12px]">
            <span>
              Total Reports: <strong>{reports.length}</strong>
            </span>
            <span>
              NC:{" "}
              <strong className="text-error">
                {reports.filter((r) => r.severity === "non_conformance").length}
              </strong>
            </span>
            <span>
              OFI:{" "}
              <strong className="text-primary">
                {
                  reports.filter((r) => r.severity === "open_for_improvement")
                    .length
                }
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}