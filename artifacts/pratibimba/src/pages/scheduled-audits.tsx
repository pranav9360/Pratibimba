import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useApp, PRAKALPAS, AUDITORS, type ScheduledAudit } from "../context/app-context";

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
          <p className="font-body-md text-on-surface-variant mt-0.5">{audit.prakalpa}</p>
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
          <p className="font-body-md text-on-surface-variant">{audit.prakalpa} — {audit.purpose}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-lg p-4 text-left space-y-2">
          <div className="flex justify-between font-body-md">
            <span className="text-on-surface-variant">Final Auditor</span>
            <span className="font-medium text-on-surface">{audit.finalAuditor}</span>
          </div>
          <div className="flex justify-between font-body-md">
            <span className="text-on-surface-variant">Period</span>
            <span className="font-medium text-on-surface">
              {new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
            </span>
          </div>
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
  const { scheduledAudits, currentUser, updateScheduledAudit } = useApp();
  const [editTarget, setEditTarget] = useState<ScheduledAudit | null>(null);
  const [reportTarget, setReportTarget] = useState<ScheduledAudit | null>(null);
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
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

  const filtered = useMemo(() => {
    return scheduledAudits.filter((s) => {
      const status = getStatus(s);
      const matchSearch = search === "" || s.iqaNumber.toLowerCase().includes(search.toLowerCase()) || s.prakalpa.toLowerCase().includes(search.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || s.prakalpa === filterPrakalpa;
      const matchAuditor = filterAuditor === "All" || s.finalAuditor === filterAuditor;
      const matchStatus = filterStatus === "All" || status === filterStatus.toLowerCase();
      // auditor can only see their own scheduled audits
      const matchUser = !isAuditor || s.finalAuditor === currentUser.auditorName;
      return matchSearch && matchPrakalpa && matchAuditor && matchStatus && matchUser;
    });
  }, [scheduledAudits, search, filterPrakalpa, filterAuditor, filterStatus, isAuditor, currentUser]);

  const statusBadge = (audit: ScheduledAudit) => {
    const s = getStatus(audit);
    const map = {
      ongoing: "bg-primary/10 text-primary",
      upcoming: "bg-secondary/10 text-secondary",
      completed: "bg-surface-container text-on-surface-variant",
    };
    return { style: map[s], label: s.charAt(0).toUpperCase() + s.slice(1) };
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Scheduled Audits</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{filtered.length} audits {isAuditor ? "assigned to you" : "scheduled"}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input type="text" placeholder="Search IQA number or Prakalpa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
        </div>
        <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Prakalpa</option>
          {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
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
            return (
              <div key={audit.id} className={`bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden`}>
                <div className="p-5 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-data-mono text-[12px] text-primary font-bold">{audit.iqaNumber}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${style}`}>{label}</span>
                    </div>
                    <h3 className="font-headline-sm text-on-surface">{audit.prakalpa}</h3>
                    <p className="font-body-md text-on-surface-variant">{audit.purpose}</p>
                    <div className="flex flex-wrap gap-6 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">person</span>
                        <span className="font-label-md text-on-surface-variant">{audit.finalAuditor}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">date_range</span>
                        <span className="font-data-mono text-[12px] text-on-surface-variant">
                          {new Date(audit.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – {new Date(audit.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">event</span>
                        <span className="font-label-md text-on-surface-variant/70">Scheduled: {new Date(audit.scheduledDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                      </div>
                    </div>
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
                {/* Progress bar for date range */}
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
