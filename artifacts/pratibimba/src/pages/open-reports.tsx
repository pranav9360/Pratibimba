import { useState, useMemo } from "react";
import { useApp, PRAKALPAS, AUDIT_AREAS, AUDIT_COORDINATORS, type Report } from "../context/app-context";

function downloadCSV(reports: Report[]) {
  const headers = ["Report ID (IAR)", "Prakalpa", "Location", "Internal Audit Date", "Audit Area", "Audit Findings", "Classification", "Audit Coordinator", "Status", "Corrective Action", "Date Closed", "Due Date", "IQA Report PDF"];
  const rows = reports.map((r) => [
    r.iarNumber, r.prakalpa, r.location || "", r.visitDate, r.auditArea || "",
    `"${(r.findings || "").replace(/"/g, '""')}"`,
    r.severity === "non_conformance" ? "NC" : "OFI",
    r.auditCoordinator || "", r.status,
    `"${(r.correctiveAction || r.actionTaken || "").replace(/"/g, '""')}"`,
    r.dateClosed || "", r.dueDate || "", r.iqaReportPdf || "",
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `OpenReports_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface DetailModalProps {
  report: Report;
  onClose: () => void;
}

function DetailModal({ report, onClose }: DetailModalProps) {
  const { getDaysOpen, isRedFlagged, isOverdue } = useApp();
  const days = getDaysOpen(report);
  const flagged = isRedFlagged(report);
  const overdue = isOverdue(report);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-2xl z-10 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`p-6 border-b ${flagged ? "bg-error/5 border-error/20" : "border-outline-variant/10"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-data-mono text-[13px] text-primary font-black">{report.iarNumber}</span>
                <span className="font-data-mono text-[11px] text-on-surface-variant">IQA: {report.iqaNumber}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">OPEN</span>
                {flagged && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error/10 text-error">🚨 Red Flagged</span>}
                {overdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error/20 text-error">⚠ Overdue</span>}
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-full transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Prakalpa", value: report.prakalpa },
              { label: "Location", value: report.location || "—" },
              { label: "Prakalpa Pramukh", value: report.prakalphaPramukh || "—" },
              { label: "Internal Audit Date", value: new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
              { label: "Audit Area", value: report.auditArea || "—" },
              { label: "Coordinator", value: report.auditCoordinator || "—" },
              { label: "Days Open", value: `${days} days` },
              { label: "Due Date", value: report.dueDate ? new Date(report.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-label-md text-on-surface-variant/70">{item.label}</p>
                <p className="font-body-md font-semibold text-on-surface mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-1">Classification</p>
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-label-md font-bold ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
              {report.severity === "non_conformance" ? "NC — Non-Conformance" : "OFI — Open for Improvement"}
            </span>
          </div>
          <div>
            <p className="font-label-md text-on-surface-variant/70 mb-2">Audit Findings</p>
            <div className="bg-surface-container-lowest rounded-lg p-4 font-body-md text-on-surface leading-relaxed">{report.findings}</div>
          </div>
          {(report.correctiveAction || report.actionTaken) && (
            <div>
              <p className="font-label-md text-on-surface-variant/70 mb-2">Corrective Action</p>
              <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4 font-body-md text-on-surface">{report.correctiveAction || report.actionTaken}</div>
            </div>
          )}
          {report.iqaReportPdf && (
            <div className="flex items-center gap-2 text-secondary font-label-md">
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              IQA Report: {report.iqaReportPdf}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OpenReportsPage() {
  const { reports, currentUser, getDaysOpen, isRedFlagged, isOverdue, addActionTaken, closeReport } = useApp();
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);
  const [filterReportId, setFilterReportId] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterAuditDate, setFilterAuditDate] = useState("");
  const [filterAuditArea, setFilterAuditArea] = useState("All");
  const [filterClassification, setFilterClassification] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCorrectiveAction, setFilterCorrectiveAction] = useState("");
  const [search, setSearch] = useState("");

  const isChief = currentUser.role === "chief_auditor";
  const isAuditor = currentUser.role === "auditor";
  const isManager = currentUser.role === "prakalpa_manager";

  const openReports = useMemo(() => reports.filter((r) => r.status === "open"), [reports]);

  const allLocations = useMemo(() => {
    const s = new Set<string>();
    openReports.forEach((r) => { if (r.location) s.add(r.location); });
    return Array.from(s);
  }, [openReports]);

  const filtered = useMemo(() => {
    return openReports.filter((r) => {
      const matchSearch = search === "" || r.iarNumber.toLowerCase().includes(search.toLowerCase()) || r.prakalpa.toLowerCase().includes(search.toLowerCase()) || (r.findings || "").toLowerCase().includes(search.toLowerCase());
      const matchReportId = filterReportId === "" || r.iarNumber.toLowerCase().includes(filterReportId.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || r.prakalpa === filterPrakalpa;
      const matchLocation = filterLocation === "All" || r.location === filterLocation;
      const matchAuditDate = filterAuditDate === "" || r.visitDate === filterAuditDate;
      const matchArea = filterAuditArea === "All" || r.auditArea === filterAuditArea;
      const matchClass = filterClassification === "All" || (filterClassification === "NC" ? r.severity === "non_conformance" : r.severity === "open_for_improvement");
      const matchCoord = filterCoordinator === "All" || r.auditCoordinator === filterCoordinator;
      const matchStatus = filterStatus === "All" || (filterStatus === "Overdue" ? isOverdue(r) : filterStatus === "Flagged" ? isRedFlagged(r) : true);
      const matchCA = filterCorrectiveAction === "" || (r.correctiveAction || r.actionTaken || "").toLowerCase().includes(filterCorrectiveAction.toLowerCase());
      const matchUser = isManager ? r.prakalpa === currentUser.prakalpa : isAuditor ? r.auditor === currentUser.auditorName : true;
      return matchSearch && matchReportId && matchPrakalpa && matchLocation && matchAuditDate && matchArea && matchClass && matchCoord && matchStatus && matchCA && matchUser;
    });
  }, [openReports, search, filterReportId, filterPrakalpa, filterLocation, filterAuditDate, filterAuditArea, filterClassification, filterCoordinator, filterStatus, filterCorrectiveAction, isOverdue, isRedFlagged, isManager, isAuditor, currentUser]);

  const overdueCount = filtered.filter(isOverdue).length;
  const flaggedCount = filtered.filter(isRedFlagged).length;
  const ncCount = filtered.filter((r) => r.severity === "non_conformance").length;
  const ofiCount = filtered.filter((r) => r.severity === "open_for_improvement").length;

  const clearFilters = () => {
    setSearch(""); setFilterReportId(""); setFilterPrakalpa("All"); setFilterLocation("All");
    setFilterAuditDate(""); setFilterAuditArea("All"); setFilterClassification("All");
    setFilterCoordinator("All"); setFilterStatus("All"); setFilterCorrectiveAction("");
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Open Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{filtered.length} open reports</p>
        </div>
        <button onClick={() => downloadCSV(filtered)} className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors">
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download
        </button>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg">
          <span className="font-data-mono font-bold text-primary text-[16px]">{filtered.length}</span>
          <span className="font-label-md text-primary">Total Open</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-error/10 rounded-lg">
          <span className="font-data-mono font-bold text-error text-[16px]">{ncCount}</span>
          <span className="font-label-md text-error">NC</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 rounded-lg">
          <span className="font-data-mono font-bold text-secondary text-[16px]">{ofiCount}</span>
          <span className="font-label-md text-secondary">OFI</span>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-error/20 rounded-lg">
            <span className="material-symbols-outlined text-error text-[18px]">warning</span>
            <span className="font-data-mono font-bold text-error text-[16px]">{overdueCount}</span>
            <span className="font-label-md text-error">Overdue</span>
          </div>
        )}
        {flaggedCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-error/10 border border-error/30 rounded-lg">
            <span className="material-symbols-outlined text-error text-[18px]">flag</span>
            <span className="font-data-mono font-bold text-error text-[16px]">{flaggedCount}</span>
            <span className="font-label-md text-error">Red Flagged</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
            <input type="text" placeholder="Search open reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
          </div>
          <input type="text" placeholder="Report ID (IAR)" value={filterReportId} onChange={(e) => setFilterReportId(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-36" />
          {!isManager && (
            <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
              <option value="All">All Prakalpa</option>
              {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
            </select>
          )}
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Locations</option>
            {allLocations.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input type="date" value={filterAuditDate} onChange={(e) => setFilterAuditDate(e.target.value)} title="Internal Audit Date" className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none" />
          <select value={filterAuditArea} onChange={(e) => setFilterAuditArea(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Audit Areas</option>
            {AUDIT_AREAS.map((a) => <option key={a}>{a}</option>)}
          </select>
          <select value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Classification</option>
            <option value="NC">NC — Non-Conformance</option>
            <option value="OFI">OFI — Open for Improvement</option>
          </select>
          <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Coordinators</option>
            {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All</option>
            <option value="Overdue">Overdue</option>
            <option value="Flagged">Red Flagged</option>
          </select>
          <input type="text" placeholder="Corrective Action" value={filterCorrectiveAction} onChange={(e) => setFilterCorrectiveAction(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-44" />
          <button onClick={clearFilters} className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors">Clear</button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-secondary/40">check_circle</span>
          <p className="font-headline-sm text-on-surface-variant/40">No open reports found</p>
          <p className="font-body-md text-on-surface-variant/30">All clear!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20 sticky top-0">
                <tr>
                  {["Report ID", "Prakalpa", "Location", "Audit Date", "Audit Area", "Findings", "Classification", "Coordinator", "Status", "Corrective Action", "Due Date", "IQA PDF", "Actions"].map((h) => (
                    <th key={h} className="px-3 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((report, idx) => {
                  const days = getDaysOpen(report);
                  const flagged = isRedFlagged(report);
                  const overdue = isOverdue(report);
                  return (
                    <tr
                      key={report.id}
                      onClick={() => setDetailTarget(report)}
                      className={`transition-colors cursor-pointer ${flagged ? "bg-error/5 hover:bg-error/10" : overdue ? "bg-orange-50 hover:bg-orange-100/50" : idx % 2 === 1 ? "bg-surface-container-lowest/50 hover:bg-surface-container-low" : "hover:bg-surface-container-low"}`}
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          {flagged && <span className="material-symbols-outlined text-error text-[14px]">flag</span>}
                          {overdue && !flagged && <span className="material-symbols-outlined text-orange-500 text-[14px]">warning</span>}
                          <span className="font-data-mono text-[12px] text-primary font-bold">{report.iarNumber}</span>
                        </div>
                        <p className="font-data-mono text-[10px] text-on-surface-variant/60 mt-0.5">{days}d open</p>
                      </td>
                      <td className="px-3 py-3 font-body-md font-medium text-on-surface whitespace-nowrap">{report.prakalpa}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{report.location || "—"}</td>
                      <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap">{new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{report.auditArea || "—"}</td>
                      <td className="px-3 py-3 max-w-[180px]">
                        <p className="font-label-md text-on-surface-variant line-clamp-2 text-[11px]">{report.findings}</p>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                          {report.severity === "non_conformance" ? "NC" : "OFI"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{report.auditCoordinator || "—"}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-primary/10 text-primary whitespace-nowrap">Open</span>
                      </td>
                      <td className="px-3 py-3 max-w-[160px]">
                        <p className="font-label-md text-on-surface-variant line-clamp-1 text-[11px]">{report.correctiveAction || report.actionTaken || "—"}</p>
                      </td>
                      <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap">
                        {report.dueDate ? (
                          <span className={overdue ? "text-error font-bold" : "text-on-surface-variant"}>
                            {new Date(report.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            {overdue && " ⚠"}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 font-label-md text-on-surface-variant/60 text-[11px]">
                        {report.iqaReportPdf ? (
                          <span className="flex items-center gap-1 text-secondary">
                            <span className="material-symbols-outlined text-[14px]">picture_as_pdf</span>
                            PDF
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {isManager && (
                            <button title="Add Action" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                              <span className="material-symbols-outlined text-[18px]">add_task</span>
                            </button>
                          )}
                          {(isChief || (isAuditor && report.auditor === currentUser.auditorName)) && (
                            <button onClick={() => closeReport(report.id)} title="Close Report" className="p-1.5 rounded-lg hover:bg-secondary/10 text-secondary transition-colors">
                              <span className="material-symbols-outlined text-[18px]">check_circle</span>
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
          <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant flex-wrap gap-2">
            <span>Showing {filtered.length} of {openReports.length} open reports</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error/60" />NC: {ncCount}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40" />OFI: {ofiCount}</span>
              {overdueCount > 0 && <span className="flex items-center gap-1 text-error"><span className="w-2 h-2 rounded-full bg-orange-400" />Overdue: {overdueCount}</span>}
            </div>
          </div>
        </div>
      )}

      {detailTarget && <DetailModal report={detailTarget} onClose={() => setDetailTarget(null)} />}
    </div>
  );
}
