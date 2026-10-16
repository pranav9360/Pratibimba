import { compareAuditRecords } from "../../../../shared/audit-order.mjs";
import { getRequestErrorMessage, logRequestError } from "../services/request-errors";
import { FilterToolbar } from "../components/filters/filter-toolbar";
import { FilterSelect } from "../components/filters/filter-select";
import { FilterDate } from "../components/filters/filter-date";
import { matchesDateFilter, type DateFilter } from "../components/filters/date-filter-utils";
import { useState, useMemo, useRef } from "react";
import { Link } from "wouter";
import { useApp, type AuditPlan } from "../context/app-context";
import { useEffect } from "react";

import {
  getPrakalpas,
  type Prakalpa,
} from "../services/prakalpaService";

import {
  getLocations,
  type Location,
} from "../services/locationService";

import {
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
    leadAuditor: string;
    auditCoordinator: string;
  }) => void;
  auditors: string[];
  leadAuditors: string[];
  auditorDirectoryError: string | null;
  requestError?: string;
  busy?: boolean;
}
function ScheduleModal({
  plan,
  onClose,
  onSchedule,
  auditors,
  leadAuditors,
  auditorDirectoryError,
  requestError, busy,
}: ScheduleModalProps) {
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
  const [leadAuditor, setLeadAuditor] = useState("");

  const toggleAuditor = (a: string) => {
    setSelectedAuditors((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );
    if (leadAuditor === a) setLeadAuditor("");
  };

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
          {requestError && <p role="alert" className="text-sm text-error">{requestError}</p>}
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
            {auditorDirectoryError && (
              <p role="alert" className="text-sm text-red-600 mb-2">
                {auditorDirectoryError}
              </p>
            )}
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
            <label className="font-label-md text-on-surface-variant block mb-1">Lead Auditor</label>
            <select value={leadAuditor} onChange={(e) => setLeadAuditor(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              <option value="">Select Lead Auditor</option>
              {selectedAuditors.filter((name) => leadAuditors.includes(name)).map((name) => (
                <option
                  key={name}
                  value={name}
                >
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low">Cancel</button>
          <button disabled={busy || !!auditorDirectoryError || !startDate || !endDate || selectedAuditors.length === 0 || !leadAuditor || !selectedAuditors.every((name) => auditors.includes(name)) || !auditors.includes(leadAuditor)} onClick={() =>
            onSchedule({
              startDate,
              endDate,
              auditors: selectedAuditors,
              leadAuditor,
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
  prakalpas: Prakalpa[];
  masterLocations: Location[];
  requestError?: string;
  busy?: boolean;
}

function EditModal({
  plan,
  onClose,
  onSave,
  coordinators,
  prakalpas,
  masterLocations,
  requestError, busy,
}: EditModalProps) {
  const firstPrakalpa =
    plan?.prakalpa ||
    prakalpas.find((p) => p.active !== false)?.name ||
    "";

  const [selectedAreas, setSelectedAreas] = useState<string[]>(
    (plan?.auditAreas || []).filter((area) => prakalpas.find((p) => p.name === firstPrakalpa)?.auditAreas?.includes(area))
  );

  const [form, setForm] = useState({
    prakalpa: firstPrakalpa,
    location: plan?.location || "",
    sublocation: plan?.sublocation || "",
    auditPlannedDate: plan?.auditPlannedDate || "",
    auditCoordinator: plan?.auditCoordinator || coordinators[0] || "",
    prakalphaPramukh:
      prakalpas.find((p) => p.name === firstPrakalpa)?.prakalpaPramukh ||
      "",
    purpose: plan?.purpose || "",
    status: plan?.status || "pending" as const,
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const activePrakalpas = useMemo(
    () => prakalpas.filter((p) => p.active !== false),
    [prakalpas]
  );

  const selectedPrakalpa = useMemo(
    () => prakalpas.find((p) => p.name === form.prakalpa),
    [prakalpas, form.prakalpa]
  );

  const availableAuditAreas =
    selectedPrakalpa?.auditAreas || [];

  const locations = useMemo(
    () =>
      masterLocations.filter(
        (location) =>
          location.active !== false &&
          location.prakalpa === form.prakalpa
      ),
    [masterLocations, form.prakalpa]
  );

  const selectedLocation = useMemo(
    () =>
      locations.find(
        (location) =>
          location.name === form.location
      ),
    [locations, form.location]
  );

  const sublocations =
    selectedLocation?.sublocations || [];

  const handlePrakalpaChange = (name: string) => {
    const prakalpa = prakalpas.find((p) => p.name === name);

    setForm((f) => ({
      ...f,
      prakalpa: name,
      location: "",
      sublocation: "",
      prakalphaPramukh: prakalpa?.prakalpaPramukh || "",
    }));

    // Audit areas are specific to each Prakalpa.
    // Reset them whenever the Prakalpa changes.
    setSelectedAreas([]);
  };

  const toggleArea = (a: string) =>
    setSelectedAreas((p) =>
      p.includes(a)
        ? p.filter((x) => x !== a)
        : [...p, a]
    );
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
          {requestError && <p role="alert" className="text-sm text-error">{requestError}</p>}
          {/* Prakalpa */}
          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa Type <span className="text-error">*</span></label>
            <select value={form.prakalpa} onChange={(e) => handlePrakalpaChange(e.target.value)} className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none">
              <option value="">— Select Prakalpa —</option>
              {activePrakalpas.map((p) => (
                <option key={p._id || p.id || p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location & Sublocation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Location
                {locations.length > 0 && (
                  <span className="text-error"> *</span>
                )}
              </label>
              {locations.length === 0 ? (
                <div className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-lowest text-on-surface-variant/60">
                  No location configured
                </div>
              ) : (
                <select
                  value={form.location}
                  onChange={(e) => {
                    set("location", e.target.value);
                    set("sublocation", "");
                  }}
                  className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                <option value="">— Select —</option>
                {locations.map((l) => (
                  <option key={l._id || l.id || l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
                </select>
              )}
            </div>
            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">Sublocation</label>
              {sublocations.length === 0 ? (
                <div className="w-full border border-outline-variant/40 rounded-lg p-3 font-body-md bg-surface-container-lowest text-on-surface-variant/60">
                  No sublocation
                </div>
              ) : (
                <select
                  value={form.sublocation}
                  onChange={(e) => set("sublocation", e.target.value)}
                  className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">— Select Sublocation —</option>
                  {sublocations.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">Prakalpa Pramukh (Assigned Manager) <span className="text-error">*</span></label>
            <div className="w-full border border-outline-variant/40 rounded-lg p-3 bg-surface-container-lowest">
              {selectedPrakalpa?.prakalpaPramukh || `Manager assignment ${selectedPrakalpa?.managerAssignmentStatus || "missing"}. Contact the Super Admin.`}
              {selectedPrakalpa?.prakalpaPramukhEmail && <p>{selectedPrakalpa.prakalpaPramukhEmail}</p>}
            </div>
            {selectedPrakalpa?.historicalContactMismatch && <p role="status" className="text-xs text-amber-700 mt-1">Historical contact differs; assigned Manager details are used. Historical records are preserved.</p>}
            {plan?.prakalphaPramukh && plan.prakalphaPramukh !== selectedPrakalpa?.prakalpaPramukh && <p className="text-xs mt-1">Historical plan Pramukh: {plan.prakalphaPramukh}. Saving this edit uses the assigned Manager.</p>}
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
              {availableAuditAreas.map((area) => (
                <button key={area} type="button" onClick={() => toggleArea(area)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border-2 transition-all ${selectedAreas.includes(area) ? "bg-primary text-on-primary border-primary" : "bg-white text-on-surface-variant border-outline-variant hover:border-primary/50"}`}>
                  {area}
                </button>
              ))}
            </div>
            {availableAuditAreas.length === 0 ? (
              <p className="text-[11px] text-amber-700 mt-2">
                No audit areas are configured for this Prakalpa.
                Configure them from Prakalpa Management.
              </p>
            ) : selectedAreas.length === 0 ? (
              <p className="text-[11px] text-error mt-1">
                Select at least one audit area
              </p>
            ) : null}
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
              busy || !form.prakalpa ||
              !form.auditPlannedDate ||
              (locations.length > 0 && !form.location) ||
              !form.auditCoordinator ||
              !form.prakalphaPramukh ||
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
    auditorDirectoryError,
    coordinatorUsers,
    refreshLiveData
  } = useApp();
  const [pageError, setPageError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const actionBusyRef = useRef(false);
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([]);
  const [prakalpas, setPrakalpas] = useState<Prakalpa[]>([]);
  const [masterLocations, setMasterLocations] = useState<Location[]>([]);

  useEffect(() => {
    loadAuditPlans();
    loadMasterData();
  }, []);

  async function loadMasterData() {
    try {
      const [prakalpaData, locationData] =
        await Promise.all([
          getPrakalpas(),
          getLocations(),
        ]);

      setPrakalpas(prakalpaData);
      setMasterLocations(locationData);
    } catch (err) {
      logRequestError("Failed to load Audit Plan master data:", err);
      setPageError(getRequestErrorMessage(err, "Unable to load Audit Plan master data."));
    }
  }

  async function loadAuditPlans() {
    try {
      const response = await getAuditPlans();

      if (response.success) {
        setAuditPlans(response.data);
      }
    } catch (err) {
      logRequestError("Audit Plan request failed", err);
      setPageError(getRequestErrorMessage(err, "Unable to load Audit Plans."));
    }
  }
  const coordinatorNames = coordinatorUsers.map((u) => u.name);
  const [scheduleTarget, setScheduleTarget] = useState<AuditPlan | null>(null);
  const [editTarget, setEditTarget] = useState<AuditPlan | null | "new">(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [filterCoordinator, setFilterCoordinator] = useState("All");
  const [filterSublocation, setFilterSublocation] = useState("All");
  const [filterAuditArea, setFilterAuditArea] = useState("All");
  const [filterPramukh, setFilterPramukh] = useState("All");
  const [filterAuditor, setFilterAuditor] = useState("All");
  const [filterDate, setFilterDate] = useState<DateFilter>({ mode: "all", start: "", end: "" });
  const [filterStatus, setFilterStatus] = useState("All");

  const [showAllPlans, setShowAllPlans] =
    useState(false);

  const canManageAuditPlans = currentUser.role === "admin" || currentUser.role === "super_admin";
  const canManageScheduling = currentUser.role === "admin" || currentUser.role === "super_admin" || currentUser.role === "audit_coordinator";
  const canSeeAuditPlanActions = canManageAuditPlans || canManageScheduling;

  const allLocations = useMemo(() => [...new Set(auditPlans.map((p) => p.location).filter(Boolean))], [auditPlans]);

  const filtered = useMemo(() => {
    return auditPlans
      .filter((p) => {
        const q = search.toLowerCase();

        const ms =
          !q ||
          (p.iqaNumber || "").toLowerCase().includes(q) ||
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
          (filterStatus === "All" || p.status === filterStatus) &&
          (filterSublocation === "All" || p.sublocation === filterSublocation) &&
          (filterAuditArea === "All" || (p.auditAreas || []).includes(filterAuditArea)) &&
          (filterPramukh === "All" || p.prakalphaPramukh === filterPramukh) &&
          (filterAuditor === "All" || (p.auditors || []).includes(filterAuditor)) &&
          matchesDateFilter(p.auditPlannedDate, undefined, filterDate);

        // Default view = active Audit Plans only.
        // Show All = include completed/older records too.
        const matchesView =
          showAllPlans
            ? ["pending", "scheduled", "completed"].includes(p.status)
            : p.status === "pending";

        return matchesExistingFilters && matchesView;
      })
      .sort(compareAuditRecords);
  }, [
    auditPlans,
    search,
    filterPrakalpa,
    filterLocation,
    filterCoordinator,
    filterStatus,
    filterSublocation,
    filterAuditArea,
    filterPramukh,
    filterAuditor,
    filterDate,
    showAllPlans,
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      {pageError && <p role="alert" className="rounded-lg bg-error/5 p-3 text-sm text-error">{pageError}</p>}
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
          {canManageAuditPlans && (
            <button onClick={() => setEditTarget("new")} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-sm hover:brightness-110">
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Audit Plan
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterToolbar search={{ value: search, onChange: setSearch, placeholder: "Search Audit ID, Prakalpa, Location..." }}
          filters={[
            ...(search ? [{ key: "search", label: "Search", value: search, onRemove: () => setSearch("") }] : []),
            ...(filterPrakalpa !== "All" ? [{ key: "filterPrakalpa", label: "Prakalpa", value: filterPrakalpa, onRemove: () => setFilterPrakalpa("All") }] : []),
            ...(filterLocation !== "All" ? [{ key: "filterLocation", label: "Location", value: filterLocation, onRemove: () => setFilterLocation("All") }] : []),
            ...(filterCoordinator !== "All" ? [{ key: "filterCoordinator", label: "Coordinator", value: filterCoordinator, onRemove: () => setFilterCoordinator("All") }] : []),
            ...(filterStatus !== "All" ? [{ key: "filterStatus", label: "Status", value: filterStatus, onRemove: () => setFilterStatus("All") }] : []),
            ...(filterSublocation !== "All" ? [{ key: "sublocation", label: "Sublocation", value: filterSublocation, onRemove: () => setFilterSublocation("All") }] : []),
            ...(filterAuditArea !== "All" ? [{ key: "auditArea", label: "Audit Area", value: filterAuditArea, onRemove: () => setFilterAuditArea("All") }] : []),
            ...(filterPramukh !== "All" ? [{ key: "pramukh", label: "Pramukh", value: filterPramukh, onRemove: () => setFilterPramukh("All") }] : []),
            ...(filterAuditor !== "All" ? [{ key: "auditor", label: "Auditor", value: filterAuditor, onRemove: () => setFilterAuditor("All") }] : []),
            ...(filterDate.mode !== "all" && filterDate.start ? [{ key: "date", label: "Planned Date", value: filterDate.mode === "range" ? `${filterDate.start} to ${filterDate.end || "…"}` : `${filterDate.mode}: ${filterDate.start}`, onRemove: () => setFilterDate({ mode: "all", start: "", end: "" }) }] : [])
          ]}
          onClearAll={() => { setSearch(""); setFilterPrakalpa("All"); setFilterLocation("All"); setFilterCoordinator("All"); setFilterStatus("All"); setFilterSublocation("All"); setFilterAuditArea("All"); setFilterPramukh("All"); setFilterAuditor("All"); setFilterDate({ mode: "all", start: "", end: "" }); }} resultCount={filtered.length} resultLabel="plans shown">
          <FilterSelect label="Prakalpa" value={filterPrakalpa} onChange={setFilterPrakalpa} options={prakalpas.filter(p => p.active !== false).map(p => ({ value: p.name, label: p.name }))} searchable allLabel="All Prakalpas" />
          <FilterSelect label="Location" value={filterLocation} onChange={setFilterLocation} options={allLocations.map(value => ({ value, label: value }))} searchable allLabel="All Locations" />
          <FilterSelect label="Coordinator" value={filterCoordinator} onChange={setFilterCoordinator} options={coordinatorNames.map(value => ({ value, label: value }))} searchable allLabel="All Coordinators" />
          <FilterSelect label="Status" value={filterStatus} onChange={setFilterStatus} options={[{ value: "pending", label: "Pending" }, { value: "scheduled", label: "Scheduled" }, { value: "completed", label: "Completed" }]} allLabel="All Statuses" />
          <FilterSelect label="Sublocation" value={filterSublocation} onChange={setFilterSublocation} options={[...new Set(auditPlans.map(p => p.sublocation).filter((value): value is string => typeof value === "string" && value.length > 0))].map(value => ({ value, label: value }))} searchable />
          <FilterSelect label="Audit Area" value={filterAuditArea} onChange={setFilterAuditArea} options={[...new Set(auditPlans.flatMap(p => p.auditAreas || []))].map(value => ({ value, label: value }))} searchable />
          <FilterSelect label="Pramukh" value={filterPramukh} onChange={setFilterPramukh} options={[...new Set(auditPlans.map(p => p.prakalphaPramukh).filter((value): value is string => typeof value === "string" && value.length > 0))].map(value => ({ value, label: value }))} searchable />
          <FilterSelect label="Auditor" value={filterAuditor} onChange={setFilterAuditor} options={[...new Set(auditPlans.flatMap(p => p.auditors || []))].map(value => ({ value, label: value }))} searchable />
          <FilterDate label="Planned Date" value={filterDate} onChange={setFilterDate} />
        </FilterToolbar>

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
          {canManageAuditPlans && <button onClick={() => setEditTarget("new")} className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold">Create First Plan</button>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  {["Audit ID", "Prakalpa", "Location", "Sublocation", "Audit Areas", "Planned Date", "Coordinator", "Pramukh (recorded)", "Auditors", "Status", ...(canSeeAuditPlanActions ? ["Actions"] : [])].map((h) => (
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
                    {canSeeAuditPlanActions && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">

                          {plan.status === "pending" && (
                            <>
                                {canManageScheduling && (
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
                                )}

                                {canManageAuditPlans && (<>
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
                                </>)}
                            </>
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
          requestError={actionError}
          busy={actionBusy}
          onClose={() => setScheduleTarget(null)}
          onSchedule={async (data) => {
            if (actionBusyRef.current) return;
            actionBusyRef.current = true; setActionBusy(true); setActionError("");
            try {
              const id = scheduleTarget.id || scheduleTarget._id || "";
              await scheduleAudit(id, data);

              await loadAuditPlans();

              setScheduleTarget(null);
            } catch (err) {
              logRequestError("Audit Plan change failed", err);
              setActionError(getRequestErrorMessage(err, "Unable to save this Audit Plan change."));
            } finally { actionBusyRef.current = false; setActionBusy(false); }
          }}
          auditors={auditors}
          leadAuditors={auditors}
          auditorDirectoryError={auditorDirectoryError}
        />
      )}
      {editTarget && (
        <EditModal
          plan={editTarget === "new" ? null : editTarget}
          requestError={actionError}
          busy={actionBusy}
          onClose={() => setEditTarget(null)}
          onSave={async (data) => {
            if (actionBusyRef.current) return;
            actionBusyRef.current = true; setActionBusy(true); setActionError("");
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
              logRequestError("Audit Plan change failed", err);
              setActionError(getRequestErrorMessage(err, "Unable to save this Audit Plan change."));
            } finally { actionBusyRef.current = false; setActionBusy(false); }
          }}
          coordinators={coordinatorNames}
          prakalpas={prakalpas}
          masterLocations={masterLocations}
        />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-sm z-10 p-6 text-center space-y-4">
            <span className="material-symbols-outlined text-error text-[40px]">delete_forever</span>
            <h3 className="font-headline-sm">Delete Audit Plan?</h3>
            <p className="font-body-md text-on-surface-variant">This action cannot be undone.</p>
            {actionError && <p role="alert" className="text-sm text-error">{actionError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md">Cancel</button>
              <button disabled={actionBusy} onClick={async () => {
                if (actionBusyRef.current) return;
                actionBusyRef.current = true; setActionBusy(true); setActionError("");
                try {
                  await deleteAuditPlan(deleteConfirm);

                  await loadAuditPlans();

                  setDeleteConfirm(null);
                } catch (err) {
                  logRequestError("Audit Plan delete failed", err);
                  setActionError(getRequestErrorMessage(err, "Unable to delete this Audit Plan."));
                } finally { actionBusyRef.current = false; setActionBusy(false); }
              }} className="flex-1 py-2.5 bg-error text-white rounded-lg font-label-md font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}