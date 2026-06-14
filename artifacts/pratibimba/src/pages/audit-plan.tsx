import { useState, useMemo } from "react";
import { useApp, PRAKALPAS, PRAKALPA_LOCATIONS, PRAKALPA_DETAILS, PRAKALPA_TYPES, AUDITORS, AUDIT_AREAS, AUDIT_COORDINATORS, type AuditPlan } from "../context/app-context";

function downloadCSV(plans: AuditPlan[]) {
  const headers = ["Audit ID", "Prakalpa", "Prakalpa Type", "Location", "Audit Planned Date", "Audit Coordinator", "Plan Password", "Audit Areas", "Prakalpa Pramukh", "Pramukh Email", "Senior Email", "Probable Auditor", "Purpose", "Status", "Created Date"];
  const rows = plans.map(p => [
    p.iqaNumber, p.prakalpa, p.prakalpaType || "", p.location || "",
    p.auditPlannedDate, p.auditCoordinator, p.planPassword,
    (p.auditAreas || []).join("; "), p.prakalphaPramukh, p.prakalphaPraMukhEmail,
    p.pramukkhSeniorEmail, p.probableAuditor,
    `"${(p.purpose || "").replace(/"/g, '""')}"`, p.status, p.createdDate,
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `AuditPlans_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

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
          <p className="font-body-md text-on-surface-variant mt-0.5">{plan.prakalpa}{plan.location ? ` — ${plan.location}` : ""}</p>
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
  const [customPrakalpa, setCustomPrakalpa] = useState("");
  const [customLocation, setCustomLocation] = useState("");
  const [showCustomPrakalpa, setShowCustomPrakalpa] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(plan?.auditAreas || []);

  const [form, setForm] = useState({
    prakalpa: plan?.prakalpa || PRAKALPAS[0],
    prakalpaType: plan?.prakalpaType || PRAKALPA_TYPES[0],
    location: plan?.location || "",
    auditPlannedDate: plan?.auditPlannedDate || "",
    auditCoordinator: plan?.auditCoordinator || AUDIT_COORDINATORS[0],
    planPassword: plan?.planPassword || "",
    prakalphaPramukh: plan?.prakalphaPramukh || PRAKALPA_DETAILS[plan?.prakalpa || PRAKALPAS[0]]?.pramukh || "",
    prakalphaPraMukhEmail: plan?.prakalphaPraMukhEmail || PRAKALPA_DETAILS[plan?.prakalpa || PRAKALPAS[0]]?.praMukhEmail || "",
    pramukkhSeniorEmail: plan?.pramukkhSeniorEmail || PRAKALPA_DETAILS[plan?.prakalpa || PRAKALPAS[0]]?.seniorEmail || "",
    probableAuditor: plan?.probableAuditor || AUDITORS[0],
    auditorEmail: plan?.auditorEmail || "",
    auditorPhone: plan?.auditorPhone || "",
    purpose: plan?.purpose || "",
    status: plan?.status || "pending" as const,
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePrakalpaChange = (val: string) => {
    if (val === "__new__") {
      setShowCustomPrakalpa(true);
      return;
    }
    setShowCustomPrakalpa(false);
    const details = PRAKALPA_DETAILS[val];
    setForm((f) => ({
      ...f,
      prakalpa: val,
      location: "",
      prakalphaPramukh: details?.pramukh || "",
      prakalphaPraMukhEmail: details?.praMukhEmail || "",
      pramukkhSeniorEmail: details?.seniorEmail || "",
    }));
  };

  const handleLocationChange = (val: string) => {
    if (val === "__new__") {
      setShowCustomLocation(true);
      return;
    }
    setShowCustomLocation(false);
    set("location", val);
  };

  const toggleArea = (area: string) => {
    setSelectedAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const effectivePrakalpa = showCustomPrakalpa ? customPrakalpa : form.prakalpa;
  const locations = PRAKALPA_LOCATIONS[effectivePrakalpa] || [];

  const handleSave = () => {
    const finalPrakalpa = showCustomPrakalpa ? customPrakalpa : form.prakalpa;
    const finalLocation = showCustomLocation ? customLocation : form.location;
    onSave({ ...form, prakalpa: finalPrakalpa, location: finalLocation, auditAreas: selectedAreas });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-2xl z-10 max-h-[92vh] flex flex-col">
        <div className="p-6 border-b border-outline-variant/10 shrink-0">
          <h3 className="font-headline-sm">{plan ? "Edit Audit Plan" : "New Audit Plan"}</h3>
          {plan && <p className="font-data-mono text-[11px] text-primary mt-1">{plan.iqaNumber}</p>}
          {!plan && <p className="font-label-md text-on-surface-variant/60 mt-1">Audit ID will be auto-generated</p>}
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Prakalpa */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa <span className="text-error">*</span></label>
              <select
                value={showCustomPrakalpa ? "__new__" : form.prakalpa}
                onChange={(e) => handlePrakalpaChange(e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {PRAKALPAS.map((p) => <option key={p} value={p}>{p}</option>)}
                <option value="__new__">+ Add New Prakalpa</option>
              </select>
              {showCustomPrakalpa && (
                <input
                  type="text"
                  placeholder="Enter new prakalpa name"
                  value={customPrakalpa}
                  onChange={(e) => setCustomPrakalpa(e.target.value)}
                  className="mt-2 w-full border border-primary rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none"
                />
              )}
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa Type</label>
              <select value={form.prakalpaType} onChange={(e) => set("prakalpaType", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                {PRAKALPA_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Location <span className="text-on-surface-variant/50">(optional)</span></label>
            <select
              value={showCustomLocation ? "__new__" : (form.location || "")}
              onChange={(e) => handleLocationChange(e.target.value)}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="">— Select Location —</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
              <option value="__new__">+ Add New Location</option>
            </select>
            {showCustomLocation && (
              <input
                type="text"
                placeholder="Enter new location"
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                className="mt-2 w-full border border-primary rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 outline-none"
              />
            )}
          </div>

          {/* Prakalpa Pramukh Details */}
          <div className="bg-surface-container-lowest rounded-xl p-4 space-y-3 border border-outline-variant/20">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-[11px]">Prakalpa Pramukh Details</p>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa Pramukh <span className="text-error">*</span></label>
              <input type="text" value={form.prakalphaPramukh} onChange={(e) => set("prakalphaPramukh", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-label-md text-on-surface-variant block mb-1">Pramukh Email <span className="text-error">*</span></label>
                <input type="email" value={form.prakalphaPraMukhEmail} onChange={(e) => set("prakalphaPraMukhEmail", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="font-label-md text-on-surface-variant block mb-1">Senior Email <span className="text-error">*</span></label>
                <input type="email" value={form.pramukkhSeniorEmail} onChange={(e) => set("pramukkhSeniorEmail", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
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

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Plan Password <span className="text-error">*</span></label>
            <input type="text" value={form.planPassword} onChange={(e) => set("planPassword", e.target.value)} placeholder="e.g. BLR2026@1" className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
          </div>

          {/* Audit Areas */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Audit Areas <span className="text-error">*</span></label>
            <div className="flex flex-wrap gap-2">
              {AUDIT_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${selectedAreas.includes(area) ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant hover:border-primary/50"}`}
                >
                  {area}
                </button>
              ))}
            </div>
            {selectedAreas.length === 0 && <p className="text-[11px] text-error mt-1">Select at least one audit area</p>}
          </div>

          {/* Auditor */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Most Probable Auditor <span className="text-error">*</span></label>
            <select value={form.probableAuditor} onChange={(e) => set("probableAuditor", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {AUDITORS.map((a) => <option key={a}>{a}</option>)}
            </select>
          </div>

          {/* Optional Auditor Details */}
          <div className="bg-surface-container-lowest rounded-xl p-4 space-y-3 border border-outline-variant/20">
            <p className="font-label-md text-on-surface-variant uppercase tracking-wider text-[11px]">Auditor Details <span className="text-on-surface-variant/50">(optional)</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-label-md text-on-surface-variant block mb-1">Auditor Email</label>
                <input type="email" value={form.auditorEmail} onChange={(e) => set("auditorEmail", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label className="font-label-md text-on-surface-variant block mb-1">Auditor Phone</label>
                <input type="tel" value={form.auditorPhone} onChange={(e) => set("auditorPhone", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Purpose <span className="text-error">*</span></label>
            <textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} rows={3} placeholder="Describe the purpose of this audit..." className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3 border-t border-outline-variant/10 mt-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors">Cancel</button>
          <button
            disabled={!form.auditPlannedDate || !form.purpose.trim() || selectedAreas.length === 0 || !form.planPassword.trim() || !effectivePrakalpa}
            onClick={handleSave}
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
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPlanPassword, setFilterPlanPassword] = useState("");

  const isChief = currentUser.role === "chief_auditor";

  const allLocations = useMemo(() => {
    const locs = new Set<string>();
    auditPlans.forEach((p) => { if (p.location) locs.add(p.location); });
    return Array.from(locs);
  }, [auditPlans]);

  const filtered = useMemo(() => {
    return auditPlans.filter((p) => {
      const matchSearch = search === "" ||
        p.iqaNumber.toLowerCase().includes(search.toLowerCase()) ||
        p.prakalpa.toLowerCase().includes(search.toLowerCase()) ||
        p.purpose.toLowerCase().includes(search.toLowerCase()) ||
        (p.auditCoordinator || "").toLowerCase().includes(search.toLowerCase());
      const matchPrakalpa = filterPrakalpa === "All" || p.prakalpa === filterPrakalpa;
      const matchLocation = filterLocation === "All" || p.location === filterLocation;
      const matchCoordinator = filterCoordinator === "All" || p.auditCoordinator === filterCoordinator;
      const matchStatus = filterStatus === "All" || p.status === filterStatus;
      const matchPassword = filterPlanPassword === "" || (p.planPassword || "").toLowerCase().includes(filterPlanPassword.toLowerCase());
      return matchSearch && matchPrakalpa && matchLocation && matchCoordinator && matchStatus && matchPassword;
    });
  }, [auditPlans, search, filterPrakalpa, filterLocation, filterCoordinator, filterStatus, filterPlanPassword]);

  const clearFilters = () => {
    setSearch(""); setFilterPrakalpa("All"); setFilterLocation("All");
    setFilterCoordinator("All"); setFilterStatus("All"); setFilterPlanPassword("");
  };

  const hasFilters = search || filterPrakalpa !== "All" || filterLocation !== "All" || filterCoordinator !== "All" || filterStatus !== "All" || filterPlanPassword;

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit Plan</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{auditPlans.length} audit plans</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => downloadCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2.5 border border-outline-variant rounded-lg font-label-md font-medium hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download
          </button>
          {isChief && (
            <button onClick={() => setEditTarget("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-sm hover:brightness-110 transition-all">
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
          <input type="text" placeholder="Search Audit ID, Prakalpa, purpose..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-surface-container-lowest" />
        </div>
        <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Prakalpa</option>
          {PRAKALPAS.map((p) => <option key={p}>{p}</option>)}
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
        <input type="text" placeholder="Plan Password" value={filterPlanPassword} onChange={(e) => setFilterPlanPassword(e.target.value)} className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none w-36" />
        {hasFilters && (
          <button onClick={clearFilters} className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors">Clear</button>
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
                  {["Audit ID", "Prakalpa", "Location", "Audit Areas", "Planned Date", "Coordinator", "Plan Password", "Pramukh", "Probable Auditor", "Status", ...(isChief ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-4 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((plan, idx) => (
                  <tr key={plan.id} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? "bg-surface-container-lowest/50" : ""}`}>
                    <td className="px-4 py-4 font-data-mono text-[12px] text-primary font-bold whitespace-nowrap">{plan.iqaNumber}</td>
                    <td className="px-4 py-4">
                      <p className="font-body-md font-medium text-on-surface">{plan.prakalpa}</p>
                      {plan.prakalpaType && <p className="font-label-md text-on-surface-variant/60 text-[11px]">{plan.prakalpaType}</p>}
                    </td>
                    <td className="px-4 py-4 font-body-md text-on-surface-variant">{plan.location || "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(plan.auditAreas || []).slice(0, 2).map((a) => (
                          <span key={a} className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold whitespace-nowrap">{a}</span>
                        ))}
                        {(plan.auditAreas || []).length > 2 && (
                          <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded text-[10px]">+{(plan.auditAreas || []).length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-data-mono text-[12px] whitespace-nowrap">
                      {plan.auditPlannedDate ? new Date(plan.auditPlannedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-4 font-body-md text-on-surface-variant">{plan.auditCoordinator}</td>
                    <td className="px-4 py-4 font-data-mono text-[11px] text-on-surface-variant">{plan.planPassword}</td>
                    <td className="px-4 py-4 font-body-md text-on-surface-variant whitespace-nowrap">{plan.prakalphaPramukh}</td>
                    <td className="px-4 py-4 font-body-md text-on-surface">{plan.probableAuditor}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${plan.status === "pending" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{plan.status}</span>
                    </td>
                    {isChief && (
                      <td className="px-4 py-4">
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
          <div className="p-4 border-t border-outline-variant/10 font-label-md text-on-surface-variant">
            Showing {filtered.length} of {auditPlans.length} plans
          </div>
        </div>
      )}

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
            else updateAuditPlan((editTarget as AuditPlan).id, data);
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
