import { useState, useMemo } from "react";
import { useApp, DOMAINS, AUDIT_COORDINATORS, type ScheduledAudit, type Report } from "../context/app-context";

function downloadCSV(rows: Array<{ audit: ScheduledAudit; reports: Report[] }>, getDaysOpen: (r: Report) => number) {
  const headers = ["Audit ID", "Domain", "Location", "Sublocation", "Audit Planned Date", "Audit Coordinator", "Audit Start Date", "Audit End Date", "Audit Days", "Auditors", "Audit Areas", "Audit Completion Date", "Classification (OFI/NC)", "Total Audit Findings", "Status", "Prakalpa Pramukh", "NC IARs", "OFI IARs"];
  const lines = rows.map(({ audit, reports: r }) => {
    const ncIARs = r.filter((x) => x.severity === "non_conformance").length;
    const ofiIARs = r.filter((x) => x.severity === "open_for_improvement").length;
    const allClosed = r.length > 0 && r.every((x) => x.status === "closed");
    const hasNC = r.some((x) => x.severity === "non_conformance" && x.status === "open");
    const hasOpen = r.some((x) => x.status === "open");
    const status = r.length === 0 ? "Planned" : allClosed ? "Completed" : hasNC ? "NC Open" : hasOpen ? "In Progress" : "Planned";
    const startDate = new Date(audit.startDate);
    const endDate = new Date(audit.endDate);
    const auditDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const classifications = [...new Set(r.map((x) => x.severity === "non_conformance" ? "NC" : "OFI"))].join("/");
    return [
      audit.iqaNumber, audit.domain, audit.location || "", audit.sublocation || "",
      audit.auditPlannedDate || "", audit.auditCoordinator,
      audit.startDate, audit.endDate, auditDays,
      (audit.auditors || [audit.finalAuditor]).join("; "),
      (audit.auditAreas || []).join("; "),
      allClosed ? audit.endDate : "",
      classifications || "—", r.length, status,
      audit.prakalphaPramukh || "", ncIARs, ofiIARs,
    ].map(String).join(",");
  });
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `IQA_Summary_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function IQASummaryPage() {
  const { scheduledAudits, auditPlans, reports, getDaysOpen, isRedFlagged } = useApp();
  const [filterDomain, setFilterDomain] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPramukh, setFilterPramukh] = useState("");
  const [filterAuditArea, setFilterAuditArea] = useState("All");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const summaryRows = useMemo(() => {
    return scheduledAudits.map((audit) => ({
      audit,
      reports: reports.filter((r) => r.iqaNumber === audit.iqaNumber),
    }));
  }, [scheduledAudits, reports]);

  const allLocations = useMemo(() => {
    const s = new Set<string>();
    scheduledAudits.forEach((a) => { if (a.location) s.add(a.location); });
    return Array.from(s);
  }, [scheduledAudits]);

  const allAuditAreas = useMemo(() => {
    const s = new Set<string>();
    scheduledAudits.forEach((a) => (a.auditAreas || []).forEach((area) => s.add(area)));
    return Array.from(s);
  }, [scheduledAudits]);

  const getAuditStatus = (r: Report[]) => {
    if (r.length === 0) return { label: "Planned", style: "bg-secondary/10 text-secondary" };
    if (r.every((x) => x.status === "closed")) return { label: "Completed", style: "bg-surface-container text-on-surface-variant" };
    const hasNC = r.some((x) => x.severity === "non_conformance" && x.status === "open");
    if (hasNC) return { label: "NC Open", style: "bg-error/10 text-error" };
    return { label: "In Progress", style: "bg-primary/10 text-primary" };
  };

  const filtered = useMemo(() => {
    return summaryRows.filter(({ audit, reports: r }) => {
      const { label: statusLabel } = getAuditStatus(r);
      const matchSearch = !search || audit.iqaNumber.toLowerCase().includes(search.toLowerCase()) || audit.domain.toLowerCase().includes(search.toLowerCase()) || (audit.prakalphaPramukh || "").toLowerCase().includes(search.toLowerCase());
      const matchDomain = filterDomain === "All" || audit.domain === filterDomain;
      const matchLocation = filterLocation === "All" || audit.location === filterLocation;
      const matchCoord = filterCoordinator === "All" || audit.auditCoordinator === filterCoordinator;
      const matchStatus = filterStatus === "All" || statusLabel.toLowerCase() === filterStatus.toLowerCase();
      const matchPramukh = !filterPramukh || (audit.prakalphaPramukh || "").toLowerCase().includes(filterPramukh.toLowerCase());
      const matchArea = filterAuditArea === "All" || (audit.auditAreas || []).includes(filterAuditArea);
      return matchSearch && matchDomain && matchLocation && matchCoord && matchStatus && matchPramukh && matchArea;
    });
  }, [summaryRows, search, filterDomain, filterLocation, filterCoordinator, filterStatus, filterPramukh, filterAuditArea]);

  const clearFilters = () => {
    setSearch(""); setFilterDomain("All"); setFilterLocation("All"); setFilterCoordinator("All");
    setFilterStatus("All"); setFilterPramukh(""); setFilterAuditArea("All");
  };

  const hasFilters = search || filterDomain !== "All" || filterLocation !== "All" || filterCoordinator !== "All" || filterStatus !== "All" || filterPramukh || filterAuditArea !== "All";

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">IQA Summary</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {scheduledAudits.length} audits · {reports.length} reports · {auditPlans.length} pending plans
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
          <div className="relative flex-1 min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
            <input type="text" placeholder="Search Audit ID, Domain, Pramukh..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
          </div>
          <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Domains</option>
            {DOMAINS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Locations</option>
            {allLocations.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Coordinators</option>
            {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Status</option>
            <option value="Planned">Planned</option>
            <option value="In Progress">In Progress</option>
            <option value="NC Open">NC Open</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Prakalpa Pramukh" value={filterPramukh} onChange={(e) => setFilterPramukh(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-44" />
          <select value={filterAuditArea} onChange={(e) => setFilterAuditArea(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Audit Areas</option>
            {allAuditAreas.map((a) => <option key={a}>{a}</option>)}
          </select>
          {hasFilters && (
            <button onClick={clearFilters} className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors">Clear all</button>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
              <tr>
                {[
                  "Audit ID", "Domain", "Location", "Sublocation", "Planned Date", "Coordinator",
                  "Start Date", "End Date", "Days", "Auditors", "Areas",
                  "Completion", "Classification", "Findings", "Status",
                  "Pramukh", "NC", "OFI", ""
                ].map((h) => (
                  <th key={h} className="px-3 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filtered.length === 0 ? (
                <tr><td colSpan={19} className="px-4 py-16 text-center font-body-md text-on-surface-variant/50">No audits found</td></tr>
              ) : (
                filtered.map(({ audit, reports: auditReports }, idx) => {
                  const statusBadge = getAuditStatus(auditReports);
                  const ncIARs = auditReports.filter((r) => r.severity === "non_conformance").length;
                  const ofiIARs = auditReports.filter((r) => r.severity === "open_for_improvement").length;
                  const hasFlag = auditReports.some(isRedFlagged);
                  const allClosed = auditReports.length > 0 && auditReports.every((r) => r.status === "closed");
                  const startDate = new Date(audit.startDate);
                  const endDate = new Date(audit.endDate);
                  const auditDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                  const classifications = [...new Set(auditReports.map((r) => r.severity === "non_conformance" ? "NC" : "OFI"))].join(", ");
                  const isExpanded = expandedId === audit.id;
                  const auditorList = audit.auditors?.length ? audit.auditors : [audit.finalAuditor];

                  return (
                    <>
                      <tr
                        key={audit.id}
                        onClick={() => setExpandedId(isExpanded ? null : audit.id)}
                        className={`cursor-pointer transition-colors ${isExpanded ? "border-l-4 border-primary bg-primary/5" : idx % 2 === 1 ? "bg-surface-container-lowest/50 hover:bg-surface-container-low" : "hover:bg-surface-container-low"}`}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            {hasFlag && <span className="material-symbols-outlined text-error text-[13px]">flag</span>}
                            <span className="font-data-mono text-[11px] text-primary font-bold">{audit.iqaNumber}</span>
                          </div>
                          {audit.mailSent && <span className="flex items-center gap-0.5 text-[9px] text-secondary mt-0.5"><span className="material-symbols-outlined text-[11px]">mark_email_read</span>Mail</span>}
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold whitespace-nowrap">{audit.domain}</span>
                        </td>
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{audit.location || "—"}</td>
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{audit.sublocation || "—"}</td>
                        <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {audit.auditPlannedDate ? new Date(audit.auditPlannedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                        </td>
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{audit.auditCoordinator}</td>
                        <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </td>
                        <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </td>
                        <td className="px-3 py-3 font-data-mono font-bold text-on-surface text-center">{auditDays}</td>
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            {auditorList.slice(0, 2).map((a) => <span key={a} className="text-[10px]">{a}</span>)}
                            {auditorList.length > 2 && <span className="text-[9px] text-on-surface-variant/60">+{auditorList.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 max-w-[120px]">
                          <div className="flex flex-wrap gap-1">
                            {(audit.auditAreas || []).slice(0, 2).map((a) => (
                              <span key={a} className="px-1 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-bold whitespace-nowrap">{a}</span>
                            ))}
                            {(audit.auditAreas || []).length > 2 && <span className="text-[9px] text-on-surface-variant">+{(audit.auditAreas || []).length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-data-mono text-[11px] whitespace-nowrap text-on-surface-variant">
                          {allClosed ? new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          {auditReports.length > 0 ? (
                            <div className="flex gap-1">
                              {ncIARs > 0 && <span className="px-1.5 py-0.5 bg-error/10 text-error rounded text-[10px] font-bold">NC:{ncIARs}</span>}
                              {ofiIARs > 0 && <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">OFI:{ofiIARs}</span>}
                            </div>
                          ) : <span className="text-on-surface-variant/50">—</span>}
                        </td>
                        <td className="px-3 py-3 font-data-mono font-bold text-center text-on-surface">{auditReports.length}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap ${statusBadge.style}`}>{statusBadge.label}</span>
                        </td>
                        <td className="px-3 py-3 text-on-surface-variant whitespace-nowrap">{audit.prakalphaPramukh || "—"}</td>
                        <td className="px-3 py-3 font-data-mono font-bold text-center">
                          <span className={ncIARs > 0 ? "text-error" : "text-on-surface-variant"}>{ncIARs}</span>
                        </td>
                        <td className="px-3 py-3 font-data-mono font-bold text-center">
                          <span className={ofiIARs > 0 ? "text-primary" : "text-on-surface-variant"}>{ofiIARs}</span>
                        </td>
                        <td className="px-3 py-3 text-on-surface-variant/50">
                          <span className="material-symbols-outlined text-[18px] transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}>expand_more</span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${audit.id}-expand`} className="bg-surface-container-lowest/80">
                          <td colSpan={19} className="px-6 py-4 border-b border-outline-variant/20">
                            <div className="space-y-3">
                              <div className="flex flex-wrap gap-4 font-body-md text-on-surface-variant text-[12px]">
                                {audit.purpose && <span><strong className="text-on-surface">Purpose:</strong> {audit.purpose}</span>}
                                {audit.sublocation && <span><strong className="text-on-surface">Sublocation:</strong> {audit.sublocation}</span>}
                              </div>
                              {auditReports.length === 0 ? (
                                <p className="font-label-md text-on-surface-variant/50 italic">No reports filed for this audit yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {auditReports.map((rp) => {
                                    const flagged = isRedFlagged(rp);
                                    const openObs = (rp.observations || []).filter((o) => o.status === "open").length;
                                    return (
                                      <div key={rp.id} className={`flex flex-wrap items-center gap-3 p-3 rounded-lg border ${flagged ? "border-error/30 bg-error/5" : "border-outline-variant/20 bg-white"}`}>
                                        <span className="font-data-mono text-[11px] font-bold text-primary">{rp.iarNumber}</span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rp.severity === "non_conformance" ? "bg-error/10 text-error" : "bg-primary/10 text-primary"}`}>
                                          {rp.severity === "non_conformance" ? "NC" : "OFI"}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${rp.status === "open" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{rp.status}</span>
                                        {rp.observations?.length > 0 && (
                                          <span className="font-label-md text-[10px] text-on-surface-variant/70">{rp.observations.length} obs{openObs > 0 ? ` (${openObs} open)` : ""}</span>
                                        )}
                                        <span className="font-label-md text-[11px] text-on-surface-variant/70">{rp.auditArea || "—"}</span>
                                        {flagged && <span className="text-error font-label-md font-bold">🚨 Red Flagged</span>}
                                        <span className="font-label-md text-on-surface-variant/60 line-clamp-1 flex-1 text-[11px]">{rp.findings || (rp.observations?.[0]?.finding) || "—"}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-outline-variant/10 flex justify-between items-center font-label-md text-on-surface-variant flex-wrap gap-2">
          <span>{filtered.length} of {scheduledAudits.length} audits shown</span>
          <div className="flex gap-4 text-[12px]">
            <span>Total Reports: <strong>{reports.length}</strong></span>
            <span>NC: <strong className="text-error">{reports.filter(r => r.severity === "non_conformance").length}</strong></span>
            <span>OFI: <strong className="text-primary">{reports.filter(r => r.severity === "open_for_improvement").length}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
