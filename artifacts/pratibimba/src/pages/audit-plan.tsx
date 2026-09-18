import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useApp, PRAKALPAS, LOCATIONS, getSublocations, PRAKALPA_PRAMUKH_DETAILS, AUDIT_AREAS, type AuditPlan } from "../context/app-context";
import { useEffect } from "react";

import {
  unscheduleAuditPlan,
  getAuditPlans,
  createAuditPlan,
  updateAuditPlan,
  deleteAuditPlan,
  scheduleAudit,
} from "../services/auditPlanService";

function downloadCSV(plans: AuditPlan[]) {
  const headers = ["Audit ID", "Prakalpa", "Location", "Sublocation", "Audit Planned Date", "Audit Coordinator", "Audit Areas", "Prakalpa Pramukh", "Auditors", "Purpose", "Status", "Created Date"];
  const rows = plans.map(p => [p.iqaNumber, p.prakalpa, p.location, p.sublocation || "", p.auditPlannedDate, p.auditCoordinator, (p.auditAreas || []).join("; "), p.prakalphaPramukh, (p.auditors || []).join("; "), `"${(p.purpose || "").replace(/"/g, '""')}"`, p.status, p.createdDate].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `AuditPlans_${new Date().toISOString().split("T")[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

interface ScheduleModalProps {
  plan: AuditPlan;
  onClose: () => void;
  onSchedule: (data: {
    startDate: string;
    endDate: string;
    auditors: string[];
    finalAuditor: string;
    auditCoordinator: string;
  }) => void;
  auditors: string[];
}
function ScheduleModal({ plan, onClose, onSchedule, auditors }: ScheduleModalProps) {
  const [startDate, setStartDate] = useState(
    plan.auditPlannedDate
      ? new Date(plan.auditPlannedDate).toISOString().split("T")[0]
      : ""
  );
  const [endDate, setEndDate] = useState(
    plan.auditPlannedDate
      ? new Date(plan.auditPlannedDate).toISOString().split("T")[0]
      : ""
  );
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
          <p className="font-body-md text-on-surface-variant mt-0.5">{plan.prakalpa} — {plan.location}{plan.sublocation ? `, ${plan.sublocation}` : ""}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const value = e.target.value;
                  setStartDate(value);

                  if (!endDate || value > endDate) {
                    setEndDate(value);
                  }
                }}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">End Date</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Audit Coordinator
            </label>

            <div className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-lowest text-on-surface-variant">
              {plan.auditCoordinator || "—"}
            </div>

            <p className="text-[11px] text-on-surface-variant/60 mt-1">
              Coordinator selected during Audit Planning
            </p>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-2">Auditors</label>
            <div className="flex flex-wrap gap-2">
              {auditors.map((a, idx) => (
                <button key={`${a}-${idx}`} type="button" onClick={() => toggleAuditor(a)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${selectedAuditors.includes(a) ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant hover:border-primary/50"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Lead / Final Auditor</label>
            <select value={finalAuditor} onChange={(e) => setFinalAuditor(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {(selectedAuditors.length > 0 ? selectedAuditors : auditors).map((a, idx) => <option key={`${a}-${idx}`}>{a}</option>)}
            </select>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
          <button disabled={!startDate || !endDate || selectedAuditors.length === 0} onClick={() =>
            onSchedule({
              startDate,
              endDate,
              auditors: selectedAuditors,
              finalAuditor,
              auditCoordinator: plan.auditCoordinator,
            })
          } className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-40">Schedule Audit</button>
        </div>
      </div>
    </div>
  );
}

interface EditModalProps {
  plan: AuditPlan | null;
  onClose: () => void;
  onSave: (data: Omit<AuditPlan, "id" | "iqaNumber" | "createdDate">) => void;
  coordinators: string[];
}

function EditModal({
  plan,
  onClose,
  onSave,
  coordinators,
}: EditModalProps) {
  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    plan?.auditAreas || []
  );
  const [form, setForm] = useState({
    prakalpa: plan?.prakalpa || PRAKALPAS[0],
    location: plan?.location || "",
    sublocation: plan?.sublocation || "",
    auditPlannedDate: plan?.auditPlannedDate || "",
    auditCoordinator: plan?.auditCoordinator || coordinators[0] || "",
    prakalphaPramukh: plan?.prakalphaPramukh || PRAKALPA_PRAMUKH_DETAILS[plan?.prakalpa || PRAKALPAS[0]]?.pramukh || "",
    purpose: plan?.purpose || "",
    status: plan?.status || "pending" as const,
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handlePrakalpaChange = (d: string) => {
    const details = PRAKALPA_PRAMUKH_DETAILS[d];
    setForm((f) => ({ ...f, prakalpa: d, location: "", sublocation: "", prakalphaPramukh: details?.pramukh || "" }));
  };

  const locations = LOCATIONS[form.prakalpa] || [];
  const sublocations = getSublocations(form.prakalpa, form.location);

  const toggleArea = (a: string) => setSelectedAreas((p) => p.includes(a) ? p.filter((x) => x !== a) : [...p, a]);
  const handleSave = () => {
    onSave({
      ...form,
      auditAreas: selectedAreas,

      // Auditors are assigned only during scheduling.
      auditors: [],

      prakalpa: form.prakalpa,
    });
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
          {/* Prakalpa */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa Type <span className="text-error">*</span></label>
            <select value={form.prakalpa} onChange={(e) => handlePrakalpaChange(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              {PRAKALPAS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Location & Sublocation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Audit Planned Date <span className="text-error">*</span></label>
              <input type="date" value={(form.auditPlannedDate || "").split("T")[0]} onChange={(e) => set("auditPlannedDate", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Audit Coordinator <span className="text-error">*</span></label>
              <select value={form.auditCoordinator} onChange={(e) => set("auditCoordinator", e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
                <option value="">— Select Coordinator —</option>
                {coordinators.map((c, idx) => <option key={`${c}-${idx}`}>{c}</option>)}
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

          {/* Purpose (optional) */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Audit Purpose <span className="text-on-surface-variant/40">(optional)</span></label>
            <textarea value={form.purpose} onChange={(e) => set("purpose", e.target.value)} rows={3} placeholder="Describe the purpose of this audit..." className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3 border-t border-outline-variant/10 mt-2 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
          <button
            disabled={
              !form.auditPlannedDate ||
              !form.location ||
              !form.auditCoordinator ||
              selectedAreas.length === 0
            }
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
  const {
    currentUser,
    auditors,
    coordinatorUsers,
    refreshLiveData
  } = useApp();
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([]);
  useEffect(() => {
    loadAuditPlans();
  }, []);

  async function loadAuditPlans() {
    try {
      const response = await getAuditPlans();

      if (response.success) {
        setAuditPlans(response.data);
      }
    } catch (err) {
      console.error(err);
    }
  }
  const coordinatorNames = coordinatorUsers.map((u) => u.name);
  const [scheduleTarget, setScheduleTarget] = useState<AuditPlan | null>(null);
  const [editTarget, setEditTarget] = useState<AuditPlan | null | "new">(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [unscheduleTarget, setUnscheduleTarget] =
    useState<AuditPlan | null>(null);

  const [isUnscheduling, setIsUnscheduling] =
    useState(false);

  const [unscheduleError, setUnscheduleError] =
    useState("");
  const [search, setSearch] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [showAllPlans, setShowAllPlans] =
    useState(false);

  const isLead = currentUser.role === "lead_auditor";

  const allLocations = useMemo(() => [...new Set(auditPlans.map((p) => p.location).filter(Boolean))], [auditPlans]);

  const handleUnschedule =
    async () => {
      if (!unscheduleTarget) {
        return;
      }

      const id =
        unscheduleTarget.id ||
        unscheduleTarget._id;

      if (!id) {
        setUnscheduleError(
          "Audit Plan ID is missing."
        );
        return;
      }

      try {
        setIsUnscheduling(true);
        setUnscheduleError("");

        await unscheduleAuditPlan(
          id
        );

        await loadAuditPlans();
        await refreshLiveData();

        setUnscheduleTarget(null);
      } catch (err: any) {
        console.error(
          "Failed to unschedule audit:",
          err
        );

        setUnscheduleError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to unschedule audit."
        );
      } finally {
        setIsUnscheduling(false);
      }
    };

  const filtered = useMemo(() => {
    return auditPlans
      .filter((p) => {
        const q = search.toLowerCase();

        const ms =
          !q ||
          p.iqaNumber.toLowerCase().includes(q) ||
          p.prakalpa.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          (p.purpose || "").toLowerCase().includes(q);

        // Keep all existing filters unchanged.
        const matchesExistingFilters =
          ms &&
          (filterPrakalpa === "All" ||
            p.prakalpa === filterPrakalpa) &&
          (filterLocation === "All" ||
            p.location === filterLocation) &&
          (filterCoordinator === "All" ||
            p.auditCoordinator === filterCoordinator) &&
          (filterStatus === "All" ||
            p.status === filterStatus);

        // Default view = active Audit Plans only.
        // Show All = include completed/older records too.
        const matchesView =
          showAllPlans
            ? ["pending", "scheduled", "completed"].includes(p.status)
            : p.status === "pending";

        return matchesExistingFilters && matchesView;
      })
      .sort((a, b) =>
        a.iqaNumber.localeCompare(
          b.iqaNumber,
          undefined,
          {
            numeric: true,
            sensitivity: "base",
          }
        )
      );
  }, [
    auditPlans,
    search,
    filterPrakalpa,
    filterLocation,
    filterCoordinator,
    filterStatus,
    showAllPlans,
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit Plan</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">{auditPlans.length} plans</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
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
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">search</span>
          <input type="text" placeholder="Search Audit ID, Prakalpa, Location..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-surface-container-lowest" />
        </div>
        <select value={filterPrakalpa} onChange={(e) => setFilterPrakalpa(e.target.value)} className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Prakalpas</option>
          {PRAKALPAS.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Locations</option>
          {allLocations.map((l) => <option key={l}>{l}</option>)}
        </select>
        <select value={filterCoordinator} onChange={(e) => setFilterCoordinator(e.target.value)} className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Coordinators</option>
          {coordinatorNames.map((c, idx) => <option key={`${c}-${idx}`}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full sm:w-auto border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white outline-none">
          <option value="All">All Status</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
        </select>
        {(search || filterPrakalpa !== "All" || filterLocation !== "All" || filterCoordinator !== "All" || filterStatus !== "All") && (
          <button onClick={() => { setSearch(""); setFilterPrakalpa("All"); setFilterLocation("All"); setFilterCoordinator("All"); setFilterStatus("All"); }} className="font-label-md text-on-surface-variant/60 hover:text-primary">Clear</button>
        )}
      </div>

      {/* Audit plan visibility */}
      <div className="flex items-center justify-start -mt-2">
        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAllPlans}
            onChange={(e) =>
              setShowAllPlans(e.target.checked)
            }
            className="w-4 h-4 accent-primary cursor-pointer"
          />

          <span className="font-label-md text-on-surface-variant">
            Show all audit plans
          </span>
        </label>
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
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  {["Audit ID", "Prakalpa", "Location", "Sublocation", "Audit Areas", "Planned Date", "Coordinator", "Pramukh", "Auditors", "Status", ...(isLead ? ["Actions"] : [])].map((h) => (
                    <th key={h} className="px-4 py-3 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((plan, idx) => (
                  <tr key={plan.id || plan._id || `plan-${idx}`} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? "bg-surface-container-lowest/50" : ""}`}>
                    <td className="px-4 py-3 font-data-mono text-[12px] text-primary font-bold whitespace-nowrap">{plan.iqaNumber}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold">{plan.prakalpa}</span>
                    </td>
                    <td className="px-4 py-3 font-body-md font-medium text-on-surface">{plan.location}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant">{plan.sublocation || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(plan.auditAreas || []).slice(0, 2).map((a) => <span key={`${a}-${idx}`} className="px-1.5 py-0.5 bg-secondary/10 text-secondary rounded text-[10px] font-medium whitespace-nowrap">{a}</span>)}
                        {(plan.auditAreas || []).length > 2 && <span className="px-1.5 py-0.5 bg-surface-container text-on-surface-variant rounded text-[10px]">+{(plan.auditAreas || []).length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-data-mono text-[12px] whitespace-nowrap">{plan.auditPlannedDate ? new Date(plan.auditPlannedDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{plan.auditCoordinator}</td>
                    <td className="px-4 py-3 font-body-md text-on-surface-variant whitespace-nowrap">{plan.prakalphaPramukh}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(plan.auditors || []).slice(0, 2).map((a) => <span key={`${a}-${idx}`} className="px-1.5 py-0.5 bg-surface-container rounded text-[10px] whitespace-nowrap">{a}</span>)}
                        {(plan.auditors || []).length > 2 && <span className="text-[10px] text-on-surface-variant">+{(plan.auditors || []).length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${plan.status === "pending" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"}`}>{plan.status}</span>
                    </td>
                    {isLead && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">

                          {plan.status === "pending" && (
                            <>
                              <button
                                onClick={() =>
                                  setScheduleTarget(
                                    plan
                                  )
                                }
                                title="Schedule"
                                className="p-1.5 rounded-lg hover:bg-primary/10 text-primary"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  event
                                </span>
                              </button>

                              <button
                                onClick={() =>
                                  setEditTarget(
                                    plan
                                  )
                                }
                                title="Edit"
                                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  edit
                                </span>
                              </button>

                              <button
                                onClick={() =>
                                  setDeleteConfirm(
                                    plan.id ||
                                      plan._id ||
                                      ""
                                  )
                                }
                                title="Delete"
                                className="p-1.5 rounded-lg hover:bg-error/10 text-error"
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  delete
                                </span>
                              </button>
                            </>
                          )}

                          {plan.status === "scheduled" && (
                            <button
                              onClick={() => {
                                setUnscheduleError("");
                                setUnscheduleTarget(
                                  plan
                                );
                              }}
                              title="Unschedule"
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-700"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                event_busy
                              </span>
                            </button>
                          )}

                          {plan.status === "completed" && (
                            <span className="text-[11px] text-on-surface-variant/60 italic">
                              Completed
                            </span>
                          )}

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

      {scheduleTarget && (
        <ScheduleModal
          plan={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onSchedule={async (data) => {
            try {
              const id = scheduleTarget.id || scheduleTarget._id || "";
              await scheduleAudit(id, data);

              await loadAuditPlans();

              setScheduleTarget(null);
            } catch (err) {
              console.error(err);
            }
          }}
          auditors={auditors}
        />
      )}
      {editTarget && (
        <EditModal
          plan={editTarget === "new" ? null : editTarget}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => {
            try {
              if (editTarget === "new") {
                await createAuditPlan(data);
              } else {
                const target = editTarget as AuditPlan;
                await updateAuditPlan(target.id || target._id || "", data);
              }

              await loadAuditPlans();

              setEditTarget(null);
            } catch (err) {
              console.error(err);
            }
          }}
          coordinators={coordinatorNames}
        />
      )}
      {unscheduleTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">

          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!isUnscheduling) {
                setUnscheduleTarget(null);
                setUnscheduleError("");
              }
            }}
          />

          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-floating border border-outline-variant/20 overflow-hidden">

            <div className="p-6 border-b border-outline-variant/10">

              <div className="flex items-start gap-3">

                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined">
                    event_busy
                  </span>
                </div>

                <div className="flex-1">
                  <h3 className="font-headline-sm text-on-surface">
                    Unschedule Audit?
                  </h3>

                  <p className="font-body-md text-on-surface-variant mt-1">
                    {unscheduleTarget.iqaNumber}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isUnscheduling}
                  onClick={() => {
                    setUnscheduleTarget(null);
                    setUnscheduleError("");
                  }}
                  className="p-1.5 rounded-lg hover:bg-surface-container disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    close
                  </span>
                </button>

              </div>

            </div>

            <div className="p-6 space-y-4">

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">

                <p className="text-sm font-semibold text-amber-900">
                  This will move the audit back to Planned status.
                </p>

                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  The linked Scheduled Audit and all scheduling-specific values will be removed.
                </p>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-bold">
                    Prakalpa
                  </p>
                  <p className="mt-1 font-medium">
                    {unscheduleTarget.prakalpa}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-bold">
                    Location
                  </p>
                  <p className="mt-1 font-medium">
                    {unscheduleTarget.location}
                  </p>
                </div>

              </div>

              {unscheduleError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {unscheduleError}
                </div>
              )}

            </div>

            <div className="p-6 border-t border-outline-variant/10 flex justify-end gap-3">

              <button
                type="button"
                disabled={isUnscheduling}
                onClick={() => {
                  setUnscheduleTarget(null);
                  setUnscheduleError("");
                }}
                className="px-4 py-2 border border-outline-variant rounded-lg font-label-md font-semibold hover:bg-surface-container disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isUnscheduling}
                onClick={handleUnschedule}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-label-md font-bold hover:bg-amber-700 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {isUnscheduling ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Unscheduling...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[17px]">
                      event_busy
                    </span>
                    Confirm Unschedule
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
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
              <button onClick={async () => {
                try {
                  await deleteAuditPlan(deleteConfirm);

                  await loadAuditPlans();

                  setDeleteConfirm(null);
                } catch (err) {
                  console.error(err);
                }
              }} className="flex-1 py-2.5 bg-error text-white rounded-lg font-label-md font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}