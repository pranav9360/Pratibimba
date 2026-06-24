import { useState, useMemo } from "react";
import { useApp, DOMAINS, AUDIT_COORDINATORS, type ScheduledAudit } from "../context/app-context";

export default function ScheduledAuditsPage() {
  const { scheduledAudits, reports, currentUser, auditors, updateScheduledAudit } = useApp();
  const [editTarget, setEditTarget] = useState<ScheduledAudit | null>(null);
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");

  const isLead = currentUser.role === "lead_auditor";
  const isAuditor = currentUser.role === "auditor";

  const getStatus = (s: ScheduledAudit) => {
    const now = new Date();
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    if (start > now) return "upcoming";
    if (end < now) return "completed";
    return "ongoing";
  };

  const allLocations = useMemo(() => [...new Set(scheduledAudits.map((s) => s.location).filter(Boolean))], [scheduledAudits]);

  const filtered = useMemo(() => scheduledAudits.filter((s) => {
    const status = getStatus(s);
    const q = search.toLowerCase();
    const ms = !q || s.iqaNumber.toLowerCase().includes(q) || s.domain.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || (s.prakalphaPramukh || "").toLowerCase().includes(q);
    const matchUser = !isAuditor || (s.auditors || []).includes(currentUser.auditorName || "");
    return ms && (filterDomain === "All" || s.domain === filterDomain) && (filterLocation === "All" || s.location === filterLocation) && (filterAuditor === "All" || (s.auditors || []).includes(filterAuditor)) && (filterStatus === "All" || status === filterStatus.toLowerCase()) && (filterCoordinator === "All" || s.auditCoordinator === filterCoordinator) && matchUser;
  }), [scheduledAudits, search, filterDomain, filterLocation, filterAuditor, filterStatus, filterCoordinator, isAuditor, currentUser]);

  const statusBadge = (s: ScheduledAudit) => {
    const st = getStatus(s);
    return {
      ongoing: { label: "Ongoing", cls: "bg-primary/10 text-primary" },
      upcoming: { label: "Upcoming", cls: "bg-secondary/10 text-secondary" },
      completed: { label: "Completed", cls: "bg-surface-container text-on-surface-variant" },
    }[st];
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Scheduled Audits</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{filtered.length} audits</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input type="text" placeholder="Search Audit ID, Domain, Location..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
        </div>
        <select value={filterDomain} onChange={(e) => setFilterDomain(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Domains</option>
          {DOMAINS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Locations</option>
          {allLocations.map((l) => <option key={l}>{l}</option>)}
        </select>
        {!isAuditor && (
          <select value={filterAuditor} onChange={(e) => setFilterAuditor(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Auditors</option>
            {auditors.map((a) => <option key={a}>{a}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Status</option>
          <option value="Upcoming">Upcoming</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
        </select>
        <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Coordinators</option>
          {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
        </select>
        {(search || filterDomain !== "All" || filterLocation !== "All" || filterAuditor !== "All" || filterStatus !== "All" || filterCoordinator !== "All") && (
          <button onClick={() => { setSearch(""); setFilterDomain("All"); setFilterLocation("All"); setFilterAuditor("All"); setFilterStatus("All"); setFilterCoordinator("All"); }} className="font-label-md text-on-surface-variant/60 hover:text-primary">Clear</button>
        )}
      </div>

      {/* Row Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">pending_actions</span>
          <p className="font-headline-sm text-on-surface-variant/40">No scheduled audits</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  {["Audit ID", "Domain", "Location", "Sublocation", "Audit Areas", "Auditors", "Dates", "Coordinator", "Pramukh", "Status", "Mail", "NC", "OFI", ...(isLead ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-3 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((audit, idx) => {
                  const { label, cls } = statusBadge(audit);
                  const auditReports = reports.filter((r) => r.iqaNumber === audit.iqaNumber);
                  const ncIARs = auditReports.filter((r) => r.severity === "non_conformance").length;
                  const ofiIARs = auditReports.filter((r) => r.severity === "open_for_improvement").length;
                  const now = new Date();
                  const start = new Date(audit.startDate);
                  const end = new Date(audit.endDate);
                  const pct = Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100));

                  return (
                    <tr key={audit.id} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? "bg-surface-container-lowest/50" : ""}`}>
                      <td className="px-3 py-3">
                        <p className="font-data-mono text-[12px] text-primary font-bold">{audit.iqaNumber}</p>
                        {/* progress bar under ID */}
                        <div className="h-1 bg-surface-container-high rounded-full mt-1.5 w-20">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold whitespace-nowrap">{audit.domain}</span>
                      </td>
                      <td className="px-3 py-3 font-body-md font-medium text-on-surface whitespace-nowrap">{audit.location}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{audit.sublocation || "—"}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(audit.auditAreas || []).slice(0, 2).map((a) => <span key={a} className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded text-[10px] whitespace-nowrap">{a}</span>)}
                          {(audit.auditAreas || []).length > 2 && <span className="text-[10px] text-on-surface-variant">+{(audit.auditAreas || []).length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="space-y-0.5">
                          {(audit.auditors || [audit.finalAuditor]).map((a) => (
                            <p key={a} className="font-label-md text-[11px] text-on-surface-variant whitespace-nowrap">{a}</p>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-data-mono text-[11px] text-on-surface-variant whitespace-nowrap">
                          {new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">{audit.auditCoordinator}</td>
                      <td className="px-3 py-3 font-body-md text-on-surface-variant whitespace-nowrap text-[12px]">{audit.prakalphaPramukh}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${cls}`}>{label}</span>
                      </td>
                      <td className="px-3 py-3">
                        {audit.mailSent ? (
                          <span title="Mail sent" className="flex items-center gap-1 text-secondary text-[11px] font-label-md">
                            <span className="material-symbols-outlined text-[14px]">mark_email_read</span>
                            Sent
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/40 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center font-data-mono font-bold text-[13px]">
                        {ncIARs > 0 ? <span className="text-error">{ncIARs}</span> : <span className="text-on-surface-variant/30">0</span>}
                      </td>
                      <td className="px-3 py-3 text-center font-data-mono font-bold text-[13px]">
                        {ofiIARs > 0 ? <span className="text-primary">{ofiIARs}</span> : <span className="text-on-surface-variant/30">0</span>}
                      </td>
                      {isLead && (
                        <td className="px-3 py-3">
                          <button onClick={() => setEditTarget(audit)} className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant/10 font-label-md text-on-surface-variant">
            {filtered.length} of {scheduledAudits.length} audits · {filtered.filter(s => getStatus(s) === "ongoing").length} ongoing · {filtered.filter(s => getStatus(s) === "upcoming").length} upcoming
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
            <div className="p-6 border-b border-outline-variant/10">
              <h3 className="font-headline-sm">Edit Scheduled Audit</h3>
              <p className="font-data-mono text-[11px] text-primary mt-1">{editTarget.iqaNumber}</p>
              <p className="font-body-md text-on-surface-variant mt-0.5">{editTarget.domain} — {editTarget.location}</p>
            </div>
            <div className="p-6 space-y-4">
              {(() => {
                const [sd, setSd] = useState(editTarget.startDate);
                const [ed, setEd] = useState(editTarget.endDate);
                const [sel, setSel] = useState<string[]>(editTarget.auditors || [editTarget.finalAuditor]);
                const [lead, setLead] = useState(editTarget.finalAuditor);
                const toggle = (a: string) => setSel((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="font-label-md text-on-surface-variant block mb-1">Start Date</label>
                        <input type="date" value={sd} onChange={(e) => setSd(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none" />
                      </div>
                      <div>
                        <label className="font-label-md text-on-surface-variant block mb-1">End Date</label>
                        <input type="date" value={ed} onChange={(e) => setEd(e.target.value)} min={sd} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="font-label-md text-on-surface-variant block mb-2">Auditors</label>
                      <div className="flex flex-wrap gap-2">
                        {auditors.map((a) => (
                          <button key={a} type="button" onClick={() => toggle(a)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${sel.includes(a) ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant"}`}>{a}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="font-label-md text-on-surface-variant block mb-1">Lead Auditor</label>
                      <select value={lead} onChange={(e) => setLead(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 outline-none">
                        {(sel.length > 0 ? sel : auditors).map((a) => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={() => setEditTarget(null)} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md">Cancel</button>
                      <button onClick={() => { updateScheduledAudit(editTarget.id, { startDate: sd, endDate: ed, auditors: sel, finalAuditor: lead }); setEditTarget(null); }} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold">Save</button>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
