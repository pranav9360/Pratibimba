import { useState, useMemo } from "react";
import { useApp, DOMAINS, AUDIT_AREAS, AUDIT_COORDINATORS, type Report } from "../context/app-context";

function downloadCSV(reports: Report[]) {
  const headers = ["Report ID (IAR)", "Domain", "Location", "Audit Date", "Auditor", "Observations", "Classification", "Coordinator", "Status", "Due Date"];
  const rows = reports.map((r) => [
    r.iarNumber, r.domain, r.location || "", r.visitDate, r.auditor,
    `"${(r.observations || []).map((o, i) => `${i + 1}. ${o.finding}`).join(" | ").replace(/"/g, '""')}"`,
    r.severity === "non_conformance" ? "NC" : "OFI",
    r.auditCoordinator || "", r.status, r.dueDate || "",
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
  canEdit: boolean;
  onAddCA: (obsId: string, action: string) => void;
  onCloseObs: (obsId: string) => void;
  onCloseReport: () => void;
  canAutoClose: boolean;
}

function DetailModal({ report, onClose, canEdit, onAddCA, onCloseObs, onCloseReport, canAutoClose }: DetailModalProps) {
  const { getDaysOpen, isRedFlagged, isOverdue } = useApp();
  const [editingObs, setEditingObs] = useState<string | null>(null);
  const [caText, setCaText] = useState<Record<string, string>>({});
  const days = getDaysOpen(report);
  const flagged = isRedFlagged(report);
  const overdue = isOverdue(report);

  const handleCASubmit = (obsId: string) => {
    const text = caText[obsId]?.trim();
    if (!text) return;
    onAddCA(obsId, text);
    setEditingObs(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-3xl z-10 flex flex-col max-h-[92vh]">
        <div className={`p-6 border-b shrink-0 ${flagged ? "bg-error/5 border-error/20" : "border-outline-variant/10"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <span className="font-data-mono text-[14px] text-primary font-black">{report.iarNumber}</span>
                <span className="font-data-mono text-[11px] text-on-surface-variant">IQA: {report.iqaNumber}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary/10 text-primary">OPEN</span>
                {flagged && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error/10 text-error">🚨 Red Flagged</span>}
                {overdue && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-error/20 text-error">⚠ Overdue</span>}
              </div>
              <p className="font-body-md text-on-surface-variant">{report.domain} — {report.location}{report.sublocation ? `, ${report.sublocation}` : ""}</p>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-full"><span className="material-symbols-outlined">close</span></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: "Auditor", value: report.auditor },
              { label: "Coordinator", value: report.auditCoordinator || "—" },
              { label: "Prakalpa Pramukh", value: report.prakalphaPramukh || "—" },
              { label: "Audit Date", value: new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) },
              { label: "Days Open", value: `${days} days` },
              { label: "Due Date", value: report.dueDate ? new Date(report.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—" },
            ].map((item) => (
              <div key={item.label}>
                <p className="font-label-md text-on-surface-variant/70 text-[11px]">{item.label}</p>
                <p className="font-body-md font-semibold text-on-surface mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Observations */}
          <div>
            <h4 className="font-label-md text-on-surface font-bold uppercase tracking-wider mb-3">
              Observations ({report.observations?.length || 0})
            </h4>
            <div className="space-y-3">
              {(report.observations || []).map((obs) => (
                <div key={obs.id} className={`rounded-xl border-2 p-4 ${obs.status === "closed" ? "border-secondary/20 bg-secondary/5" : obs.severity === "non_conformance" ? "border-error/30 bg-error/5" : "border-primary/20 bg-primary/5"}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${obs.severity === "non_conformance" ? "bg-error text-white" : "bg-primary text-on-primary"}`}>{obs.number}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${obs.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                        {obs.severity === "non_conformance" ? "NC" : "OFI"}
                      </span>
                      <span className="font-label-md text-on-surface-variant/70 text-[11px]">{obs.area}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${obs.status === "closed" ? "bg-secondary/10 text-secondary" : "bg-surface-container text-on-surface-variant"}`}>
                      {obs.status === "closed" ? "Closed" : "Open"}
                    </span>
                  </div>
                  <p className="font-body-md text-on-surface leading-relaxed">{obs.finding}</p>
                  {obs.correctiveAction ? (
                    <div className="mt-3 bg-white/70 rounded-lg p-3">
                      <p className="font-label-md text-secondary/80 text-[11px] uppercase tracking-wider mb-1">Corrective Action</p>
                      <p className="font-body-md text-on-surface">{obs.correctiveAction}</p>
                      {obs.status === "open" && canEdit && (
                        <button onClick={() => onCloseObs(obs.id)} className="mt-2 px-3 py-1.5 bg-secondary text-on-secondary rounded-lg font-label-md font-bold text-[12px]">
                          Mark Closed
                        </button>
                      )}
                    </div>
                  ) : canEdit ? (
                    <div className="mt-3">
                      {editingObs === obs.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={caText[obs.id] || ""}
                            onChange={(e) => setCaText((p) => ({ ...p, [obs.id]: e.target.value }))}
                            rows={3}
                            placeholder="Describe the corrective action taken..."
                            className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none resize-none text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingObs(null)} className="px-3 py-1.5 border border-outline-variant rounded-lg font-label-md text-[12px]">Cancel</button>
                            <button onClick={() => handleCASubmit(obs.id)} disabled={!caText[obs.id]?.trim()} className="px-3 py-1.5 bg-primary text-on-primary rounded-lg font-label-md font-bold text-[12px] disabled:opacity-40">Save</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => { setEditingObs(obs.id); setCaText((p) => ({ ...p, [obs.id]: "" })); }} className="px-3 py-1.5 border-2 border-dashed border-primary/40 text-primary rounded-lg font-label-md text-[12px] hover:bg-primary/5">
                          + Add Corrective Action
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-on-surface-variant/50 italic">No corrective action yet</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="p-4 border-t border-outline-variant/10 shrink-0">
            <button
              onClick={onCloseReport}
              disabled={!canAutoClose}
              title={!canAutoClose ? "Add corrective actions to all observations first" : ""}
              className={`w-full py-3 rounded-lg font-label-md font-bold transition-all ${canAutoClose ? "bg-secondary text-on-secondary hover:brightness-110" : "bg-surface-container-high text-on-surface-variant cursor-not-allowed"}`}
            >
              {canAutoClose ? "Close Report" : `Close Report (${(report.observations || []).filter((o) => !o.correctiveAction.trim()).length} observations need corrective action)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OpenReportsPage() {
  const { reports, currentUser, getDaysOpen, isRedFlagged, isOverdue, addObservationCorrectiveAction, closeObservation, closeReport, canAutoClose } = useApp();
  const [detailTarget, setDetailTarget] = useState<Report | null>(null);
  const [filterReportId, setFilterReportId] = useState("");
  const [filterDomain, setFilterDomain] = useState("All");
  const [filterAuditArea, setFilterAuditArea] = useState("All");
  const [filterClassification, setFilterClassification] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch] = useState("");

  const isLead = currentUser.role === "lead_auditor";
  const isAuditor = currentUser.role === "auditor";
  const isManager = currentUser.role === "prakalpa_manager";
  const isCEO = currentUser.role === "ceo";
  const canEdit = !isAuditor && !isCEO;

  const openReports = useMemo(() => reports.filter((r) => r.status === "open"), [reports]);

  const filtered = useMemo(() => {
    return openReports.filter((r) => {
      const q = search.toLowerCase();
      const ms = !q || r.iarNumber.toLowerCase().includes(q) || r.domain.toLowerCase().includes(q) || (r.findings || "").toLowerCase().includes(q);
      const matchReportId = !filterReportId || r.iarNumber.toLowerCase().includes(filterReportId.toLowerCase());
      const matchDomain = filterDomain === "All" || r.domain === filterDomain;
      const matchArea = filterAuditArea === "All" || r.auditArea === filterAuditArea;
      const matchClass = filterClassification === "All" || (filterClassification === "NC" ? r.severity === "non_conformance" : r.severity === "open_for_improvement");
      const matchCoord = filterCoordinator === "All" || r.auditCoordinator === filterCoordinator;
      const matchStatus = filterStatus === "All" || (filterStatus === "Overdue" ? isOverdue(r) : filterStatus === "Flagged" ? isRedFlagged(r) : true);
      const matchUser = isManager ? r.domain === currentUser.domain : isAuditor ? r.auditor === currentUser.auditorName : true;
      return ms && matchReportId && matchDomain && matchArea && matchClass && matchCoord && matchStatus && matchUser;
    });
  }, [openReports, search, filterReportId, filterDomain, filterAuditArea, filterClassification, filterCoordinator, filterStatus, isOverdue, isRedFlagged, isManager, isAuditor, currentUser]);

  const overdueCount = filtered.filter(isOverdue).length;
  const flaggedCount = filtered.filter(isRedFlagged).length;
  const ncCount = filtered.filter((r) => r.severity === "non_conformance").length;
  const ofiCount = filtered.filter((r) => r.severity === "open_for_improvement").length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Open Reports</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{filtered.length} open reports</p>
        </div>
        <button onClick={() => downloadCSV(filtered)} className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low">
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
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input type="text" placeholder="Search open reports..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
        </div>
        <input type="text" placeholder="Report ID (IAR)" value={filterReportId} onChange={(e) => setFilterReportId(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-36" />
        {!isManager && (
          <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Domains</option>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
        )}
        <select value={filterAuditArea} onChange={(e) => setFilterAuditArea(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Areas</option>
          {AUDIT_AREAS.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={filterClassification} onChange={(e) => setFilterClassification(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Types</option>
          <option value="NC">NC</option>
          <option value="OFI">OFI</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All</option>
          <option value="Overdue">Overdue</option>
          <option value="Flagged">Red Flagged</option>
        </select>
        <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Coordinators</option>
          {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
        </select>
        {(search || filterReportId || filterDomain !== "All" || filterAuditArea !== "All" || filterClassification !== "All" || filterStatus !== "All" || filterCoordinator !== "All") && (
          <button onClick={() => { setSearch(""); setFilterReportId(""); setFilterDomain("All"); setFilterAuditArea("All"); setFilterClassification("All"); setFilterStatus("All"); setFilterCoordinator("All"); }} className="font-label-md text-on-surface-variant/60 hover:text-primary">Clear</button>
        )}
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
                  {["Report ID", "Domain", "Location", "Audit Date", "Auditor", "Obs.", "NC", "OFI", "Type", "Coordinator", "Due Date"].map((h) => (
                    <th key={h} className="px-3 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((report, idx) => {
                  const days = getDaysOpen(report);
                  const flagged = isRedFlagged(report);
                  const overdue = isOverdue(report);
                  const ncObs = (report.observations || []).filter((o) => o.severity === "non_conformance").length;
                  const ofiObs = (report.observations || []).filter((o) => o.severity === "open_for_improvement").length;
                  const openObs = (report.observations || []).filter((o) => o.status === "open").length;
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
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold whitespace-nowrap">{report.domain}</span>
                      </td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">{report.location || "—"}</td>
                      <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap">{new Date(report.visitDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant text-[12px] whitespace-nowrap">{report.auditor}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-data-mono font-bold text-[13px] ${openObs > 0 ? "text-primary" : "text-on-surface-variant/30"}`}>{report.observations?.length || 0}</span>
                        {openObs > 0 && <span className="font-label-md text-[10px] text-on-surface-variant/60 block">{openObs} open</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-data-mono font-bold text-[13px]">
                        {ncObs > 0 ? <span className="text-error">{ncObs}</span> : <span className="text-on-surface-variant/30">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-data-mono font-bold text-[13px]">
                        {ofiObs > 0 ? <span className="text-primary">{ofiObs}</span> : <span className="text-on-surface-variant/30">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${report.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                          {report.severity === "non_conformance" ? "NC" : "OFI"}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">{report.auditCoordinator || "—"}</td>
                      <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap">
                        {report.dueDate ? (
                          <span className={overdue ? "text-error font-bold" : "text-on-surface-variant"}>
                            {new Date(report.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            {overdue && " ⚠"}
                          </span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant flex-wrap gap-2">
            <span>Showing {filtered.length} of {openReports.length} open reports</span>
            <div className="flex gap-3 text-[12px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error/60" />NC: {ncCount}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/40" />OFI: {ofiCount}</span>
              {overdueCount > 0 && <span className="flex items-center gap-1 text-error"><span className="w-2 h-2 rounded-full bg-orange-400" />Overdue: {overdueCount}</span>}
            </div>
          </div>
        </div>
      )}

      {detailTarget && (
        <DetailModal
          report={detailTarget}
          onClose={() => setDetailTarget(null)}
          canEdit={canEdit}
          canAutoClose={canAutoClose(detailTarget)}
          onAddCA={(obsId, action) => {
            addObservationCorrectiveAction(detailTarget.id, obsId, action);
            setDetailTarget((prev) => prev ? { ...prev, observations: prev.observations.map((o) => o.id === obsId ? { ...o, correctiveAction: action } : o) } : null);
          }}
          onCloseObs={(obsId) => {
            closeObservation(detailTarget.id, obsId);
            setDetailTarget((prev) => {
              if (!prev) return null;
              const observations = prev.observations.map((o) => o.id === obsId ? { ...o, status: "closed" as const, dateClosed: new Date().toISOString().split("T")[0] } : o);
              const allClosed = observations.every((o) => o.status === "closed");
              return { ...prev, observations, status: allClosed ? "closed" as const : prev.status };
            });
          }}
          onCloseReport={() => {
            closeReport(detailTarget.id);
            setDetailTarget(null);
          }}
        />
      )}
    </div>
  );
}
