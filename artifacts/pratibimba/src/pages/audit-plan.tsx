import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useApp, PRAKALPAS, AUDITORS, type AuditPlan } from "../context/app-context";

interface ScheduleModalProps {
  plan: AuditPlan;
  onClose: () => void;
  onSchedule: (data: { startDate: string; endDate: string; finalAuditor: string }) => void;
}

function ScheduleModal({ plan, onClose, onSchedule }: ScheduleModalProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [finalAuditor, setFinalAuditor] = useState(plan.probableAuditor);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-md z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Schedule Audit</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">{plan.iqaNumber}</p>
          <p className="font-body-md text-on-surface-variant mt-0.5">{plan.prakalpa} — {plan.purpose}</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Final Auditor</label>
            <select value={finalAuditor} onChange={(e) => setFinalAuditor(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
              {AUDITORS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
          <button
            disabled={!startDate || !endDate || !finalAuditor}
            onClick={() => onSchedule({ startDate, endDate, finalAuditor })}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Schedule Audit
          </button>
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  plan: AuditPlan | null;
  onClose: () => void;
  onSave: (data: Omit<AuditPlan, "id" | "iqaNumber" | "createdDate">) => void;
}

function EditModal({ plan, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState({
    expectedEndDate: plan?.expectedEndDate || "",
    probableAuditor: plan?.probableAuditor || AUDITORS[0],
    prakalpa: plan?.prakalpa || PRAKALPAS[0],
    purpose: plan?.purpose || "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-lg z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">{plan ? "Edit Audit Plan" : "New Audit Plan"}</h3>
          {plan && <p className="font-data-mono text-[11px] text-primary mt-1">{plan.iqaNumber}</p>}
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa (Location)</label>
            <select value={form.prakalpa} onChange={(e) => set("prakalpa", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Most Probable Auditor</label>
            <select value={form.probableAuditor} onChange={(e) => set("probableAuditor", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {AUDITORS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Expected End Date</label>
            <input type="date" value={form.expectedEndDate} onChange={(e) => set("expectedEndDate", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Purpose</label>
            <textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} rows={3} placeholder="Describe the purpose of this audit..." className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
          <button
            disabled={!form.expectedEndDate || !form.purpose.trim()}
            onClick={() => onSave(form)}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-40"
          >
            {plan ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuditPlanPage() {
  const { auditPlans, currentUser, createAuditPlan, updateAuditPlan, deleteAuditPlan, scheduleAudit } = useApp();
  const [scheduleTarget, setScheduleTarget] = useState<AuditPlan | null>(null);
  const [editTarget, setEditTarget] = useState<AuditPlan | null | "new">(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");

  const isChief = currentUser.role === "chief_auditor";

  const filtered = useMemo(() => {
    return auditPlans.filter((p) => {
      const matchSearch = search === "" || p.iqaNumber.toLowerCase().includes(search.toLowerCase()) || p.prakalpa.toLowerCase().includes(search.toLowerCase()) || p.purpose.toLowerCase().includes(search.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || p.prakalpa === filterPrakalpa;
      const matchAuditor = filterAuditor === "All" || p.probableAuditor === filterAuditor;
      return matchSearch && matchPrakalpa && matchAuditor;
    });
  }, [auditPlans, search, filterPrakalpa, filterAuditor]);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit Plan</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{auditPlans.length} pending audit plans</p>
        </div>
        {isChief && (
          <button onClick={() => setEditTarget("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-sm hover:brightness-110 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Audit Plan
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input type="text" placeholder="Search IQA number, Prakalpa, purpose..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-surface-container-lowest" />
        </div>
        <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white focus:ring-primary/20 focus:border-primary outline-none">
          <option value="All">All Prakalpa</option>
          {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={filterAuditor} onChange={(e) => setFilterAuditor(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white focus:ring-primary/20 focus:border-primary outline-none">
          <option value="All">All Auditors</option>
          {AUDITORS.map((a) => <option key={a}>{a}</option>)}
        </select>
        {(search || filterPrakalpa !== "All" || filterAuditor !== "All") && (
          <button onClick={() => { setSearch(""); setFilterPrakalpa("All"); setFilterAuditor("All"); }} className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors">Clear</button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">event_note</span>
          <p className="font-headline-sm text-on-surface-variant/40">No audit plans found</p>
          {isChief && <button onClick={() => setEditTarget("new")} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold">Create First Plan</button>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  {["IQA Number", "Prakalpa", "Probable Auditor", "Audit Purpose", "Expected End Date", "Created", ...(isChief ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-5 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((plan, idx) => (
                  <tr key={plan.id} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? "bg-surface-container-lowest/50" : ""}`}>
                    <td className="px-5 py-4 font-data-mono text-[12px] text-primary font-bold whitespace-nowrap">{plan.iqaNumber}</td>
                    <td className="px-5 py-4 font-body-md font-medium text-on-surface">{plan.prakalpa}</td>
                    <td className="px-5 py-4 font-body-md text-on-surface">{plan.probableAuditor}</td>
                    <td className="px-5 py-4 font-body-md text-on-surface-variant max-w-[280px]">
                      <p className="line-clamp-2">{plan.purpose}</p>
                    </td>
                    <td className="px-5 py-4 font-data-mono text-[12px] whitespace-nowrap">
                      {new Date(plan.expectedEndDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 font-data-mono text-[12px] text-on-surface-variant/60 whitespace-nowrap">
                      {new Date(plan.createdDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    {isChief && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setScheduleTarget(plan)} title="Schedule" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors">
                            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                          </button>
                          <button onClick={() => setEditTarget(plan)} title="Edit" className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={() => setDeleteConfirm(plan.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-error/10 text-error transition-colors">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {scheduleTarget && (
        <ScheduleModal
          plan={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onSchedule={(data) => { scheduleAudit(scheduleTarget.id, data); setScheduleTarget(null); }}
        />
      )}
      {editTarget && (
        <EditModal
          plan={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(data) => {
            if (editTarget === "new") createAuditPlan(data);
            else updateAuditPlan(editTarget.id, data);
            setEditTarget(null);
          }}
        />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-sm z-10 p-6 text-center space-y-4">
            <span className="material-symbols-outlined text-error text-[40px]">delete_forever</span>
            <h3 className="font-headline-sm">Delete Audit Plan?</h3>
            <p className="font-body-md text-on-surface-variant">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md">Cancel</button>
              <button onClick={() => { deleteAuditPlan(deleteConfirm); setDeleteConfirm(null); }} className="flex-1 py-2.5 bg-error text-white rounded-lg font-label-md font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
