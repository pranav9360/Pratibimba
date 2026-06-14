import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useApp, PRAKALPAS, AUDITORS, AUDIT_COORDINATORS, type ScheduledAudit } from "../context/app-context";

interface EditScheduleModalProps {
  audit: ScheduledAudit;
  onClose: () => void;
  onSave: (data: Partial<ScheduledAudit>) => void;
}

function EditScheduleModal({ audit, onClose, onSave }: EditScheduleModalProps) {
  const [form, setForm] = useState({
    startDate: audit.startDate,
    endDate: audit.endDate,
    finalAuditor: audit.finalAuditor,
    purpose: audit.purpose,
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Edit Scheduled Audit</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">{audit.iqaNumber}</p>
          <p className="font-body-md text-on-surface-variant mt-0.5">{audit.prakalpa}{audit.location ? ` — ${audit.location}` : ""}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} min={form.startDate} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Final Auditor</label>
            <select value={form.finalAuditor} onChange={(e) => set("finalAuditor", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {AUDITORS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Purpose</label>
            <textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} rows={3} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
          <button onClick={() => onSave(form)} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

interface ReportPromptModalProps {
  audit: ScheduledAudit;
  onClose: () => void;
}

function ReportPromptModal({ audit, onClose }: ReportPromptModalProps) {
  const { reports } = useApp();
  const auditReports = reports.filter((r) => r.iqaNumber === audit.iqaNumber);
  const ncIARs = auditReports.filter((r) => r.severity === "non_conformance").length;
  const ofiIARs = auditReports.filter((r) => r.severity === "open_for_improvement").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-md z-10 p-6 text-center space-y-5">
        <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-secondary text-[32px]">description</span>
        </div>
        <div>
          <h3 className="font-headline-sm mb-1">Create Audit Report</h3>
          <p className="font-data-mono text-[12px] text-primary mb-1">{audit.iqaNumber}</p>
          <p className="font-body-md text-on-surface-variant">{audit.prakalpa}{audit.location ? ` — ${audit.location}` : ""}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-lg p-4 text-left space-y-2">
          <div className="flex justify-between font-body-md">
            <span className="text-on-surface-variant">Final Auditor</span>
            <span className="font-medium text-on-surface">{audit.finalAuditor}</span>
          </div>
          <div className="flex justify-between font-body-md">
            <span className="text-on-surface-variant">Coordinator</span>
            <span className="font-medium text-on-surface">{audit.auditCoordinator}</span>
          </div>
          <div className="flex justify-between font-body-md">
            <span className="text-on-surface-variant">Period</span>
            <span className="font-medium text-on-surface">
              {new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          </div>
          {auditReports.length > 0 && (
            <div className="flex justify-between font-body-md pt-1 border-t border-outline-variant/20">
              <span className="text-on-surface-variant">NC IARs / OFI IARs</span>
              <span className="font-medium text-on-surface">{ncIARs} / {ofiIARs}</span>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md">Cancel</button>
          <Link href={`/create-report/${audit.id}`} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold text-center">
            Create Report
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ScheduledAuditsPage() {
  const { scheduledAudits, reports, currentUser, updateScheduledAudit } = useApp();
  const [editTarget, setEditTarget] = useState<ScheduledAudit | null>(null);
  const [reportTarget, setReportTarget] = useState<ScheduledAudit | null>(null);
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterPramukh, setFilterPramukh] = useState("");
  const [filterPlanPassword, setFilterPlanPassword] = useState("");
  const [filterLocation, setFilterLocation] = useState("All");
  const [search, setSearch] = useState("");

  const isChief = currentUser.role === "chief_auditor";
  const isAuditor = currentUser.role === "auditor";

  const getStatus = (audit: ScheduledAudit) => {
    const now = new Date();
    const start = new Date(audit.startDate);
    const end = new Date(audit.endDate);
    if (start > now) return "upcoming";
    if (end < now) return "completed";
    return "ongoing";
  };

  const allPramukhs = useMemo(() => {
    const s = new Set<string>();
    scheduledAudits.forEach((a) => { if (a.prakalphaPramukh) s.add(a.prakalphaPramukh); });
    return Array.from(s);
  }, [scheduledAudits]);

  const allLocations = useMemo(() => {
    const s = new Set<string>();
    scheduledAudits.forEach((a) => { if (a.location) s.add(a.location); });
    return Array.from(s);
  }, [scheduledAudits]);

  const filtered = useMemo(() => {
    return scheduledAudits.filter((s) => {
      const status = getStatus(s);
      const auditReports = reports.filter((r) => r.iqaNumber === s.iqaNumber);
      const ncIARs = auditReports.filter((r) => r.severity === "non_conformance").length;
      const ofiIARs = auditReports.filter((r) => r.severity === "open_for_improvement").length;
      const matchSearch = search === "" || s.iqaNumber.toLowerCase().includes(search.toLowerCase()) || s.prakalpa.toLowerCase().includes(search.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || s.prakalpa === filterPrakalpa;
      const matchLocation = filterLocation === "All" || s.location === filterLocation;
      const matchAuditor = filterAuditor === "All" || s.finalAuditor === filterAuditor;
      const matchStatus = filterStatus === "All" || status === filterStatus.toLowerCase();
      const matchCoordinator = filterCoordinator === "All" || s.auditCoordinator === filterCoordinator;
      const matchPramukh = filterPramukh === "" || (s.prakalphaPramukh || "").toLowerCase().includes(filterPramukh.toLowerCase());
      const matchPassword = filterPlanPassword === "" || (s.planPassword || "").toLowerCase().includes(filterPlanPassword.toLowerCase());
      const matchUser = !isAuditor || s.finalAuditor === currentUser.auditorName;
      return matchSearch && matchPrakalpa && matchLocation && matchAuditor && matchStatus && matchCoordinator && matchPramukh && matchPassword && matchUser;
    });
  }, [scheduledAudits, reports, search, filterPrakalpa, filterLocation, filterAuditor, filterStatus, filterCoordinator, filterPramukh, filterPlanPassword, isAuditor, currentUser]);

  const statusBadge = (audit: ScheduledAudit) => {
    const s = getStatus(audit);
    const map = {
      ongoing: "bg-primary/10 text-primary",
      upcoming: "bg-secondary/10 text-secondary",
      completed: "bg-surface-container text-on-surface-variant",
    };
    return { style: map[s], label: s.charAt(0).toUpperCase() + s.slice(1) };
  };

  const clearFilters = () => {
    setSearch(""); setFilterPrakalpa("All"); setFilterLocation("All");
    setFilterAuditor("All"); setFilterStatus("All"); setFilterCoordinator("All");
    setFilterPramukh(""); setFilterPlanPassword("");
  };

  const hasFilters = search || filterPrakalpa !== "All" || filterLocation !== "All" || filterAuditor !== "All" || filterStatus !== "All" || filterCoordinator !== "All" || filterPramukh || filterPlanPassword;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Scheduled Audits</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{filtered.length} audits {isAuditor ? "assigned to you" : "scheduled"}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
            <input type="text" placeholder="Search Audit ID or Prakalpa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
          </div>
          <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Prakalpa</option>
            {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
          </select>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Locations</option>
            {allLocations.map((l) => <option key={l}>{l}</option>)}
          </select>
          {!isAuditor && (
            <select value={filterAuditor} onChange={(e) => setFilterAuditor(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
              <option value="All">All Auditors</option>
              {AUDITORS.map((a) => <option key={a}>{a}</option>)}
            </select>
          )}
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Status</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
            <option value="All">All Coordinators</option>
            {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="text" placeholder="Prakalpa Pramukh" value={filterPramukh} onChange={(e) => setFilterPramukh(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-44" />
          <input type="text" placeholder="Plan Password" value={filterPlanPassword} onChange={(e) => setFilterPlanPassword(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-36" />
          {hasFilters && (
            <button onClick={clearFilters} className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors">Clear all</button>
          )}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">calendar_month</span>
          <p className="font-headline-sm text-on-surface-variant/40">No scheduled audits found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((audit) => {
            const { style, label } = statusBadge(audit);
            const auditReports = reports.filter((r) => r.iqaNumber === audit.iqaNumber);
            const ncIARs = auditReports.filter((r) => r.severity === "non_conformance").length;
            const ofiIARs = auditReports.filter((r) => r.severity === "open_for_improvement").length;
            return (
              <div key={audit.id} className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
                <div className="p-5 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-data-mono text-[12px] text-primary font-bold">{audit.iqaNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${style}`}>{label}</span>
                    </div>
                    <h3 className="font-headline-sm text-on-surface">{audit.prakalpa}{audit.location ? <span className="font-body-md text-on-surface-variant"> — {audit.location}</span> : ""}</h3>
                    <p className="font-body-md text-on-surface-variant">{audit.purpose}</p>
                    <div className="flex flex-wrap gap-4 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">person</span>
                        <span className="font-label-md text-on-surface-variant">{audit.finalAuditor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">manage_accounts</span>
                        <span className="font-label-md text-on-surface-variant">{audit.auditCoordinator}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">date_range</span>
                        <span className="font-data-mono text-[12px] text-on-surface-variant">
                          {new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">lock</span>
                        <span className="font-data-mono text-[11px] text-on-surface-variant">{audit.planPassword}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(audit.auditAreas || []).map((area) => (
                        <span key={area} className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[11px] font-medium">{area}</span>
                      ))}
                    </div>
                    {auditReports.length > 0 && (
                      <div className="flex gap-3 pt-1">
                        <span className="flex items-center gap-1 font-label-md text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-error" />
                          NC IARs: <strong>{ncIARs}</strong>
                        </span>
                        <span className="flex items-center gap-1 font-label-md text-[11px]">
                          <span className="w-2 h-2 rounded-full bg-primary" />
                          OFI IARs: <strong>{ofiIARs}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(isAuditor && audit.finalAuditor === currentUser.auditorName) && (
                      <button onClick={() => setReportTarget(audit)} className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-md font-bold hover:brightness-110 transition-all">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        Create Report
                      </button>
                    )}
                    {isChief && (
                      <>
                        <button onClick={() => setReportTarget(audit)} className="flex items-center gap-1.5 px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-md font-bold hover:brightness-110 transition-all">
                          <span className="material-symbols-outlined text-[16px]">description</span>
                          Create Report
                        </button>
                        <button onClick={() => setEditTarget(audit)} className="p-2 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {(() => {
                  const now = new Date().getTime();
                  const start = new Date(audit.startDate).getTime();
                  const end = new Date(audit.endDate).getTime();
                  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                  return (
                    <div className="h-1 bg-surface-container-high">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {editTarget && (
        <EditScheduleModal
          audit={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(data) => { updateScheduledAudit(editTarget.id, data); setEditTarget(null); }}
        />
      )}
      {reportTarget && (
        <ReportPromptModal audit={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
}
