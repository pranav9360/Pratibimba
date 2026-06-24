import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useApp, DOMAINS, LOCATIONS, getSublocations, DOMAIN_PRAMUKH_DETAILS, AUDIT_AREAS, AUDIT_COORDINATORS, type AuditPlan } from "../context/app-context";

function downloadCSV(plans: AuditPlan[]) {
  const headers = ["Audit ID", "Domain", "Location", "Sublocation", "Audit Planned Date", "Audit Coordinator", "Audit Areas", "Prakalpa Pramukh", "Auditors", "Purpose", "Status", "Created Date"];
  const rows = plans.map(p => [p.iqaNumber, p.domain, p.location, p.sublocation || "", p.auditPlannedDate, p.auditCoordinator, (p.auditAreas || []).join("; "), p.prakalphaPramukh, (p.auditors || []).join("; "), `"${(p.purpose || "").replace(/"/g, '""')}"`, p.status, p.createdDate].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `AuditPlans_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface ScheduleModalProps {
  plan: AuditPlan;
  onClose: () => void;
  onSchedule: (data: { startDate: string; endDate: string; auditors: string[]; finalAuditor: string }) => void;
  auditors: string[];
}
function ScheduleModal({ plan, onClose, onSchedule, auditors }: ScheduleModalProps) {
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>(plan.auditors || []);
  const [finalAuditor, setFinalAuditor] = useState(plan.auditors?.[0] || auditors[0]);

  const toggleAuditor = (a: string) =>
    setSelectedAuditors((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-md z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Schedule Audit</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">{plan.iqaNumber}</p>
          <p className="font-body-md text-on-surface-variant mt-0.5">{plan.domain} — {plan.location}{plan.sublocation ? `, ${plan.sublocation}` : ""}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Auditors</label>
            <div className="flex flex-wrap gap-2">
              {auditors.map((a) => (
                <button key={a} type="button" onClick={() => toggleAuditor(a)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${selectedAuditors.includes(a) ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant hover:border-primary/50"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Lead / Final Auditor</label>
            <select value={finalAuditor} onChange={(e) => setFinalAuditor(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {(selectedAuditors.length > 0 ? selectedAuditors : auditors).map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
          <button disabled={!startDate || !endDate || selectedAuditors.length === 0} onClick={() => onSchedule({ startDate, endDate, auditors: selectedAuditors, finalAuditor })} className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-40">Schedule Audit</button>
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  plan: AuditPlan | null;
  onClose: () => void;
  onSave: (data: Omit<AuditPlan, "id" | "iqaNumber" | "createdDate">) => void;
  auditors: string[];
  onAddAuditor: (name: string) => void;
}
function EditModal({ plan, onClose, onSave, auditors, onAddAuditor }: EditModalProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(plan?.auditAreas || []);
  const [selectedAuditors, setSelectedAuditors] = useState<string[]>(plan?.auditors || []);
  const [newAuditorName, setNewAuditorName] = useState("");
  const [showNewAuditor, setShowNewAuditor] = useState(false);
  const [form, setForm] = useState({
    domain: plan?.domain || DOMAINS[0],
    location: plan?.location || "",
    sublocation: plan?.sublocation || "",
    auditPlannedDate: plan?.auditPlannedDate || "",
    auditCoordinator: plan?.auditCoordinator || AUDIT_COORDINATORS[0],
    prakalphaPramukh: plan?.prakalphaPramukh || DOMAIN_PRAMUKH_DETAILS[plan?.domain || DOMAINS[0]]?.pramukh || "",
    purpose: plan?.purpose || "",
    status: plan?.status || "pending" as const,
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleDomainChange = (d: string) => {
    const details = DOMAIN_PRAMUKH_DETAILS[d];
    setForm((f) => ({ ...f, domain: d, location: "", sublocation: "", prakalphaPramukh: details?.pramukh || "" }));
  };

  const locations = LOCATIONS[form.domain] || [];
  const sublocations = getSublocations(form.domain, form.location);

  const toggleArea = (a: string) => setSelectedAreas((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);
  const toggleAuditor = (a: string) => setSelectedAuditors((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);

  const handleAddAuditor = () => {
    const name = newAuditorName.trim();
    if (!name) return;
    onAddAuditor(name);
    setSelectedAuditors((p) => [...p, name]);
    setNewAuditorName("");
    setShowNewAuditor(false);
  };

  const handleSave = () => {
    onSave({ ...form, auditAreas: selectedAreas, auditors: selectedAuditors, prakalpa: `${form.domain} — ${form.location}${form.sublocation ? `, ${form.sublocation}` : ""}` });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-2xl z-10 max-h-[92vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 shrink-0">
          <h3 className="font-headline-sm">{plan ? "Edit Audit Plan" : "New Audit Plan"}</h3>
          {plan ? <p className="font-data-mono text-[11px] text-primary mt-1">{plan.iqaNumber}</p> : <p className="font-label-md text-on-surface-variant/50 mt-0.5">Audit ID auto-generated</p>}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Domain */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Domain Type <span className="text-error">*</span></label>
            <select value={form.domain} onChange={(e) => handleDomainChange(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {DOMAINS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Location & Sublocation */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Location <span className="text-error">*</span></label>
              <select value={form.location} onChange={(e) => { set("location", e.target.value); set("sublocation", ""); }} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" disabled={locations.length === 0}>
                <option value="">— Select —</option>
                {locations.map((l) => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Sublocation</label>
              {sublocations.length === 1 ? (
                <div className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-lowest text-on-surface-variant">
                  {sublocations[0]}
                </div>
              ) : (
                <select value={form.sublocation} onChange={(e) => set("sublocation", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" disabled={sublocations.length === 0}>
                  <option value="">— Select —</option>
                  {sublocations.map((s) => <option key={s}>{s}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Pramukh (name only, no email) */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa Pramukh <span className="text-error">*</span></label>
            <input type="text" value={form.prakalphaPramukh} onChange={(e) => set("prakalphaPramukh", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>

          {/* Audit Planning */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Audit Planned Date <span className="text-error">*</span></label>
              <input type="date" value={form.auditPlannedDate} onChange={(e) => set("auditPlannedDate", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Audit Coordinator <span className="text-error">*</span></label>
              <select value={form.auditCoordinator} onChange={(e) => set("auditCoordinator", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Audit Areas */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Audit Areas <span className="text-error">*</span></label>
            <div className="flex flex-wrap gap-2">
              {AUDIT_AREAS.map((area) => (
                <button key={area} type="button" onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${selectedAreas.includes(area) ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant hover:border-primary/50"}`}>
                  {area}
                </button>
              ))}
            </div>
            {selectedAreas.length === 0 && <p className="text-[11px] text-error mt-1">Select at least one audit area</p>}
          </div>

          {/* Auditors */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-label-md text-on-surface-variant">Auditors <span className="text-error">*</span></label>
              <button type="button" onClick={() => setShowNewAuditor((v) => !v)} className="text-[11px] text-primary font-label-md font-bold flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-[14px]">person_add</span>
                + New Auditor
              </button>
            </div>
            {showNewAuditor && (
              <div className="flex gap-2 mb-3">
                <input type="text" placeholder="Enter auditor name" value={newAuditorName} onChange={(e) => setNewAuditorName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddAuditor()} className="flex-1 border border-primary rounded-lg p-2.5 font-body-md focus:ring-2 focus:ring-primary/20 outline-none" autoFocus />
                <button type="button" onClick={handleAddAuditor} className="px-4 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold">Add</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {auditors.map((a) => (
                <button key={a} type="button" onClick={() => toggleAuditor(a)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${selectedAuditors.includes(a) ? "bg-secondary text-on-secondary border-secondary" : "bg-white text-on-surface-variant border-outline-variant hover:border-secondary/50"}`}>
                  {a}
                </button>
              ))}
            </div>
            {selectedAuditors.length === 0 && <p className="text-[11px] text-error mt-1">Select at least one auditor</p>}
          </div>

          {/* Purpose (optional) */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Purpose <span className="text-on-surface-variant/40">(optional)</span></label>
            <textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} rows={3} placeholder="Describe the purpose of this audit..." className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3 border-t border-outline-variant/10 mt-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
          <button
            disabled={!form.auditPlannedDate || !form.location || selectedAreas.length === 0 || selectedAuditors.length === 0}
            onClick={handleSave}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-40"
          >
            {plan ? "Save Changes" : "Create Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuditPlanPage() {
  const { auditPlans, currentUser, auditors, addAuditor, createAuditPlan, updateAuditPlan, deleteAuditPlan, scheduleAudit } = useApp();
  const [scheduleTarget, setScheduleTarget] = useState<AuditPlan | null>(null);
  const [editTarget, setEditTarget] = useState<AuditPlan | null | "new">(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterDomain, setFilterDomain] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const isLead = currentUser.role === "lead_auditor";

  const allLocations = useMemo(() => [...new Set(auditPlans.map((p) => p.location).filter(Boolean))], [auditPlans]);

  const filtered = useMemo(() => auditPlans.filter((p) => {
    const q = search.toLowerCase();
    const ms = !q || p.iqaNumber.toLowerCase().includes(q) || p.domain.toLowerCase().includes(q) || p.location.toLowerCase().includes(q) || (p.purpose || "").toLowerCase().includes(q);
    return ms && (filterDomain === "All" || p.domain === filterDomain) && (filterLocation === "All" || p.location === filterLocation) && (filterCoordinator === "All" || p.auditCoordinator === filterCoordinator) && (filterStatus === "All" || p.status === filterStatus);
  }), [auditPlans, search, filterDomain, filterLocation, filterCoordinator, filterStatus]);

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit Plan</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{auditPlans.length} plans</p>
        </div>
        <div className="flex gap-3">
          <Link href="/audit-calendar" className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            Calendar View
          </Link>
          <button onClick={() => downloadCSV(filtered)} className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download
          </button>
          {isLead && (
            <button onClick={() => setEditTarget("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-sm hover:brightness-110">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Audit Plan
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
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
        <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Coordinators</option>
          {AUDIT_COORDINATORS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Status</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
        </select>
        {(search || filterDomain !== "All" || filterLocation !== "All" || filterCoordinator !== "All" || filterStatus !== "All") && (
          <button onClick={() => { setSearch(""); setFilterDomain("All"); setFilterLocation("All"); setFilterCoordinator("All"); setFilterStatus("All"); }} className="font-label-md text-on-surface-variant/60 hover:text-primary">Clear</button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">event_note</span>
          <p className="font-headline-sm text-on-surface-variant/40">No audit plans found</p>
          {isLead && <button onClick={() => setEditTarget("new")} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold">Create First Plan</button>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  {["Audit ID", "Domain", "Location", "Sublocation", "Audit Areas", "Planned Date", "Coordinator", "Pramukh", "Auditors", "Status", ...(isLead ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-4 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((plan, idx) => (
                  <tr key={plan.id} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? "bg-surface-container-lowest/50" : ""}`}>
                    <td className="px-4 py-3 font-data-mono text-[12px] text-primary font-bold whitespace-nowrap">{plan.iqaNumber}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold">{plan.domain}</span>
                    </td>
                    <td className="px-4 py-3 font-body-md font-medium text-on-surface">{plan.location}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">{plan.sublocation || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(plan.auditAreas || []).slice(0, 2).map((a) => <span key={a} className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded text-[10px] font-medium whitespace-nowrap">{a}</span>)}
                        {(plan.auditAreas || []).length > 2 && <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded text-[10px]">+{(plan.auditAreas || []).length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-data-mono text-[12px] whitespace-nowrap">{plan.auditPlannedDate ? new Date(plan.auditPlannedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{plan.auditCoordinator}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{plan.prakalphaPramukh}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(plan.auditors || []).slice(0, 2).map((a) => <span key={a} className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] whitespace-nowrap">{a}</span>)}
                        {(plan.auditors || []).length > 2 && <span className="text-[10px] text-on-surface-variant">+{(plan.auditors || []).length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${plan.status === "pending" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{plan.status}</span>
                    </td>
                    {isLead && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setScheduleTarget(plan)} title="Schedule" className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"><span className="material-symbols-outlined text-[18px]">event</span></button>
                          <button onClick={() => setEditTarget(plan)} title="Edit" className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                          <button onClick={() => setDeleteConfirm(plan.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-error/10 text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant/10 font-label-md text-on-surface-variant">Showing {filtered.length} of {auditPlans.length} plans</div>
        </div>
      )}

      {scheduleTarget && <ScheduleModal plan={scheduleTarget} onClose={() => setScheduleTarget(null)} onSchedule={(data) => { scheduleAudit(scheduleTarget.id, data); setScheduleTarget(null); }} auditors={auditors} />}
      {editTarget && (
        <EditModal
          plan={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(data) => { if (editTarget === "new") createAuditPlan(data); else updateAuditPlan((editTarget as AuditPlan).id, data); setEditTarget(null); }}
          auditors={auditors}
          onAddAuditor={addAuditor}
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
