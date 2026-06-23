import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "wouter";
import {
  createAuditPlan,
  createLocation,
  createPrakalpa,
  getAuditPlans,
  getLocationsByPrakalpa,
  getPrakalpas,
  scheduleAuditPlan,
  type AuditPlan,
  type Location,
  type Prakalpa
} from "../lib/api";

const AUDITORS = [
  "Ananya Iyer",
  "Ravi Kumar",
  "Meera Sharma",
  "Arjun Rao",
  "Priya Nair"
];

const AUDIT_AREAS = [
  "Governance",
  "Documentation",
  "Finance",
  "Operations",
  "Compliance",
  "Safety",
  "Process Control",
  "Corrective Action"
];

const NEW_PRAKALPA = "__new_prakalpa__";
const NEW_LOCATION = "__new_location__";

type NewPlanForm = {
  prakalpaId: string;
  newPrakalpaName: string;
  prakalpaPramukh: string;
  prakalpaPramukhEmail: string;
  pramukhSeniorEmail: string;
  locationId: string;
  newLocationName: string;
  auditPlannedDate: string;
  expectedEndDate: string;
  auditCoordinator: string;
  mostProbableAuditor: string;
  auditPurpose: string;
  auditAreas: string[];
  planPassword: string;
};

function defaultForm(): NewPlanForm {
  return {
    prakalpaId: "",
    newPrakalpaName: "",
    prakalpaPramukh: "",
    prakalpaPramukhEmail: "",
    pramukhSeniorEmail: "",
    locationId: "",
    newLocationName: "",
    auditPlannedDate: new Date().toISOString().split("T")[0],
    expectedEndDate: "",
    auditCoordinator: "",
    mostProbableAuditor: AUDITORS[0],
    auditPurpose: "",
    auditAreas: [],
    planPassword: ""
  };
}

function formatDate(value?: string) {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getPrakalpaName(plan: AuditPlan) {
  if (typeof plan.prakalpaId === "object" && plan.prakalpaId) {
    return plan.prakalpaId.name;
  }

  return "Unknown Prakalpa";
}

function getLocationName(plan: AuditPlan) {
  if (typeof plan.locationId === "object" && plan.locationId) {
    return plan.locationId.name;
  }

  return "No location";
}

function getSavedUserRole() {
  try {
    const saved = localStorage.getItem("pratibimba_user");
    if (!saved) return "";
    return JSON.parse(saved).role || "";
  } catch {
    return "";
  }
}

interface ScheduleModalProps {
  plan: AuditPlan;
  onClose: () => void;
  onScheduled: () => void;
}

function ScheduleModal({ plan, onClose, onScheduled }: ScheduleModalProps) {
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState("");
  const [finalAuditor, setFinalAuditor] = useState(
    plan.mostProbableAuditor || AUDITORS[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSchedule() {
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await scheduleAuditPlan(plan._id, {
        startDate,
        endDate,
        finalAuditor
      });

      onScheduled();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to schedule audit"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-md z-10">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">Schedule Audit</h3>
          <p className="font-data-mono text-[11px] text-primary mt-1">
            {plan.auditId}
          </p>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {getPrakalpaName(plan)} — {plan.auditPurpose || "Audit"}
          </p>
        </div>

        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 font-body-md">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="font-label-md text-on-surface-variant block mb-1">
              Final Auditor
            </label>
            <select
              value={finalAuditor}
              onChange={(e) => setFinalAuditor(e.target.value)}
              className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            >
              {AUDITORS.map((auditor) => (
                <option key={auditor}>{auditor}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>

          <button
            disabled={!startDate || !endDate || !finalAuditor || isSubmitting}
            onClick={handleSchedule}
            className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Scheduling..." : "Schedule Audit"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface NewAuditPlanModalProps {
  prakalpas: Prakalpa[];
  locations: Location[];
  form: NewPlanForm;
  setForm: React.Dispatch<React.SetStateAction<NewPlanForm>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onPrakalpaChange: (value: string) => void;
  isSubmitting: boolean;
  errorMessage: string;
}

function NewAuditPlanModal({
  prakalpas,
  locations,
  form,
  setForm,
  onClose,
  onSubmit,
  onPrakalpaChange,
  isSubmitting,
  errorMessage
}: NewAuditPlanModalProps) {
  function setField<K extends keyof NewPlanForm>(key: K, value: NewPlanForm[K]) {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  }

  function toggleAuditArea(area: string) {
    setForm((current) => {
      const exists = current.auditAreas.includes(area);

      return {
        ...current,
        auditAreas: exists
          ? current.auditAreas.filter((item) => item !== area)
          : [...current.auditAreas, area]
      };
    });
  }

  const isNewPrakalpa = form.prakalpaId === NEW_PRAKALPA;
  const isNewLocation = form.locationId === NEW_LOCATION;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-floating w-full max-w-3xl z-10 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-outline-variant/10">
          <h3 className="font-headline-sm">New Audit Plan</h3>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            Create a backend MongoDB audit plan. Audit ID will be generated automatically.
          </p>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 font-body-md">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="font-label-md text-on-surface-variant block mb-1">
                Prakalpa
              </label>
              <select
                value={form.prakalpaId}
                onChange={(e) => onPrakalpaChange(e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              >
                <option value="">Select Prakalpa</option>
                {prakalpas.map((prakalpa) => (
                  <option key={prakalpa._id} value={prakalpa._id}>
                    {prakalpa.name}
                  </option>
                ))}
                <option value={NEW_PRAKALPA}>+ Add new Prakalpa</option>
              </select>
            </div>

            {isNewPrakalpa && (
              <>
                <div>
                  <label className="font-label-md text-on-surface-variant block mb-1">
                    New Prakalpa Name
                  </label>
                  <input
                    value={form.newPrakalpaName}
                    onChange={(e) => setField("newPrakalpaName", e.target.value)}
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Example: Yoga Kendra"
                    required
                  />
                </div>

                <div>
                  <label className="font-label-md text-on-surface-variant block mb-1">
                    Prakalpa Pramukh
                  </label>
                  <input
                    value={form.prakalpaPramukh}
                    onChange={(e) => setField("prakalpaPramukh", e.target.value)}
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="Name"
                  />
                </div>

                <div>
                  <label className="font-label-md text-on-surface-variant block mb-1">
                    Pramukh Email
                  </label>
                  <input
                    type="email"
                    value={form.prakalpaPramukhEmail}
                    onChange={(e) =>
                      setField("prakalpaPramukhEmail", e.target.value)
                    }
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="font-label-md text-on-surface-variant block mb-1">
                    Senior Email
                  </label>
                  <input
                    type="email"
                    value={form.pramukhSeniorEmail}
                    onChange={(e) =>
                      setField("pramukhSeniorEmail", e.target.value)
                    }
                    className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                    placeholder="senior@example.com"
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2">
              <label className="font-label-md text-on-surface-variant block mb-1">
                Location
              </label>
              <select
                value={form.locationId}
                onChange={(e) => setField("locationId", e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                disabled={!form.prakalpaId}
              >
                <option value="">No location / optional</option>
                {!isNewPrakalpa &&
                  locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name}
                    </option>
                  ))}
                <option value={NEW_LOCATION}>+ Add new Location</option>
              </select>
            </div>

            {isNewLocation && (
              <div className="md:col-span-2">
                <label className="font-label-md text-on-surface-variant block mb-1">
                  New Location Name
                </label>
                <input
                  value={form.newLocationName}
                  onChange={(e) => setField("newLocationName", e.target.value)}
                  className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  placeholder="Example: Bangalore Center"
                  required
                />
              </div>
            )}

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Audit Planned Date
              </label>
              <input
                type="date"
                value={form.auditPlannedDate}
                onChange={(e) => setField("auditPlannedDate", e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                required
              />
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Expected End Date
              </label>
              <input
                type="date"
                value={form.expectedEndDate}
                onChange={(e) => setField("expectedEndDate", e.target.value)}
                min={form.auditPlannedDate}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Audit Coordinator
              </label>
              <input
                value={form.auditCoordinator}
                onChange={(e) => setField("auditCoordinator", e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Coordinator name"
                required
              />
            </div>

            <div>
              <label className="font-label-md text-on-surface-variant block mb-1">
                Most Probable Auditor
              </label>
              <select
                value={form.mostProbableAuditor}
                onChange={(e) => setField("mostProbableAuditor", e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              >
                {AUDITORS.map((auditor) => (
                  <option key={auditor}>{auditor}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-label-md text-on-surface-variant block mb-1">
                Audit Areas
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {AUDIT_AREAS.map((area) => (
                  <label
                    key={area}
                    className="flex items-center gap-2 border border-outline-variant/30 rounded-lg p-2 font-label-md"
                  >
                    <input
                      type="checkbox"
                      checked={form.auditAreas.includes(area)}
                      onChange={() => toggleAuditArea(area)}
                    />
                    {area}
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="font-label-md text-on-surface-variant block mb-1">
                Audit Purpose
              </label>
              <textarea
                value={form.auditPurpose}
                onChange={(e) => setField("auditPurpose", e.target.value)}
                rows={3}
                placeholder="Describe the purpose of this audit..."
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-label-md text-on-surface-variant block mb-1">
                Plan Password
              </label>
              <input
                value={form.planPassword}
                onChange={(e) => setField("planPassword", e.target.value)}
                className="w-full border border-outline-variant rounded-lg p-3 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                placeholder="Password used to protect this audit plan"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-primary text-on-primary rounded-lg font-label-md font-bold hover:brightness-110 transition-all disabled:opacity-40"
            >
              {isSubmitting ? "Creating..." : "Create Audit Plan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AuditPlanPage() {
  const [auditPlans, setAuditPlans] = useState<AuditPlan[]>([]);
  const [prakalpas, setPrakalpas] = useState<Prakalpa[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [modalError, setModalError] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<AuditPlan | null>(null);
  const [search, setSearch] = useState("");
  const [filterPrakalpa, setFilterPrakalpa] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [form, setForm] = useState<NewPlanForm>(() => defaultForm());

  const isChief = getSavedUserRole() === "chief_auditor";

  async function loadAuditPage() {
    try {
      setPageError("");
      const [plansData, prakalpaData] = await Promise.all([
        getAuditPlans(),
        getPrakalpas()
      ]);

      setAuditPlans(plansData);
      setPrakalpas(prakalpaData);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load audit plans"
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAuditPage();
  }, []);

  async function handlePrakalpaChange(value: string) {
    setForm((current) => ({
      ...current,
      prakalpaId: value,
      locationId: "",
      newLocationName: ""
    }));

    setLocations([]);

    if (!value || value === NEW_PRAKALPA) {
      return;
    }

    try {
      const locationData = await getLocationsByPrakalpa(value);
      setLocations(locationData);
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Failed to load locations"
      );
    }
  }

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setModalError("");

      let selectedPrakalpaId = form.prakalpaId;

      if (form.prakalpaId === NEW_PRAKALPA) {
        const newPrakalpa = await createPrakalpa({
          name: form.newPrakalpaName.trim(),
          prakalpaPramukh: form.prakalpaPramukh.trim(),
          prakalpaPramukhEmail: form.prakalpaPramukhEmail.trim(),
          pramukhSeniorEmail: form.pramukhSeniorEmail.trim()
        });

        selectedPrakalpaId = newPrakalpa._id;
      }

      let selectedLocationId =
        form.locationId && form.locationId !== NEW_LOCATION
          ? form.locationId
          : undefined;

      if (form.locationId === NEW_LOCATION && form.newLocationName.trim()) {
        const newLocation = await createLocation(selectedPrakalpaId, {
          name: form.newLocationName.trim()
        });

        selectedLocationId = newLocation._id;
      }

      await createAuditPlan({
        prakalpaId: selectedPrakalpaId,
        locationId: selectedLocationId,
        auditPlannedDate: form.auditPlannedDate,
        expectedEndDate: form.expectedEndDate,
        auditCoordinator: form.auditCoordinator.trim(),
        auditPurpose: form.auditPurpose.trim(),
        mostProbableAuditor: form.mostProbableAuditor,
        auditAreas: form.auditAreas,
        planPassword: form.planPassword.trim()
      });

      setShowNewModal(false);
      setForm(defaultForm());
      setLocations([]);
      await loadAuditPage();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : "Failed to create audit plan"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const filtered = useMemo(() => {
    return auditPlans.filter((plan) => {
      const prakalpaName = getPrakalpaName(plan);
      const searchText = [
        plan.auditId,
        prakalpaName,
        getLocationName(plan),
        plan.auditPurpose,
        plan.auditCoordinator,
        plan.mostProbableAuditor,
        plan.status
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchSearch =
        search.trim() === "" ||
        searchText.includes(search.trim().toLowerCase());

      const matchPrakalpa =
        filterPrakalpa === "All" || prakalpaName === filterPrakalpa;

      const matchStatus =
        filterStatus === "All" || plan.status === filterStatus;

      return matchSearch && matchPrakalpa && matchStatus;
    });
  }, [auditPlans, search, filterPrakalpa, filterStatus]);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 p-8">
          <p className="font-body-md text-on-surface-variant">
            Loading audit plans...
          </p>
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-6">
          <p className="font-label-md font-bold">Audit plans failed to load</p>
          <p className="font-body-md mt-1">{pageError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h2 className="font-headline-md text-on-surface">Audit Plan</h2>
          <p className="font-body-md text-on-surface-variant mt-0.5">
            {auditPlans.length} backend audit plans from MongoDB
          </p>
        </div>

        {isChief && (
          <button
            onClick={() => {
              setModalError("");
              setForm(defaultForm());
              setLocations([]);
              setShowNewModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold shadow-sm hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Audit Plan
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl border border-outline-variant/20 shadow-soft flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search audit ID, Prakalpa, location, purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-outline-variant/40 rounded-lg font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-surface-container-lowest"
          />
        </div>

        <select
          value={filterPrakalpa}
          onChange={(e) => setFilterPrakalpa(e.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="All">All Prakalpa</option>
          {prakalpas.map((prakalpa) => (
            <option key={prakalpa._id}>{prakalpa.name}</option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-outline-variant/40 rounded-lg py-2 px-3 font-body-md bg-white focus:ring-primary/20 focus:border-primary outline-none"
        >
          <option value="All">All Status</option>
          <option value="planned">Planned</option>
          <option value="scheduled">Scheduled</option>
          <option value="cancelled">Cancelled</option>
        </select>

        {(search || filterPrakalpa !== "All" || filterStatus !== "All") && (
          <button
            onClick={() => {
              setSearch("");
              setFilterPrakalpa("All");
              setFilterStatus("All");
            }}
            className="font-label-md text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-outline-variant/10 shadow-soft p-16 flex flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/20">
            event_note
          </span>
          <p className="font-headline-sm text-on-surface-variant/40">
            No audit plans found
          </p>
          {isChief && (
            <button
              onClick={() => setShowNewModal(true)}
              className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-label-md font-bold"
            >
              Create First Plan
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-soft border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest border-b border-outline-variant/20">
                <tr>
                  {[
                    "Audit ID",
                    "Prakalpa",
                    "Location",
                    "Coordinator",
                    "Auditor",
                    "Purpose",
                    "Planned Date",
                    "Status",
                    ...(isChief ? ["Actions"] : [])
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 font-label-md text-on-surface-variant uppercase tracking-wider whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((plan, index) => (
                  <tr
                    key={plan._id}
                    className={`hover:bg-surface-container-low transition-colors ${
                      index % 2 === 1 ? "bg-surface-container-lowest/50" : ""
                    }`}
                  >
                    <td className="px-5 py-4 font-data-mono text-[12px] text-primary font-bold whitespace-nowrap">
                      {plan.auditId}
                    </td>

                    <td className="px-5 py-4 font-body-md font-medium text-on-surface">
                      {getPrakalpaName(plan)}
                    </td>

                    <td className="px-5 py-4 font-body-md text-on-surface-variant">
                      {getLocationName(plan)}
                    </td>

                    <td className="px-5 py-4 font-body-md text-on-surface">
                      {plan.auditCoordinator || "-"}
                    </td>

                    <td className="px-5 py-4 font-body-md text-on-surface">
                      {plan.mostProbableAuditor || "-"}
                    </td>

                    <td className="px-5 py-4 font-body-md text-on-surface-variant max-w-[280px]">
                      <p className="line-clamp-2">
                        {plan.auditPurpose || "-"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-data-mono text-[12px] whitespace-nowrap">
                      {formatDate(plan.auditPlannedDate)}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          plan.status === "scheduled"
                            ? "bg-primary/10 text-primary"
                            : plan.status === "cancelled"
                              ? "bg-error/10 text-error"
                              : "bg-secondary/10 text-secondary"
                        }`}
                      >
                        {plan.status || "planned"}
                      </span>
                    </td>

                    {isChief && (
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setScheduleTarget(plan)}
                            disabled={plan.status === "scheduled"}
                            title="Schedule"
                            className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              calendar_month
                            </span>
                          </button>

                          <Link
                            href="/scheduled-audits"
                            className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
                            title="View scheduled audits"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              visibility
                            </span>
                          </Link>
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

      {showNewModal && (
        <NewAuditPlanModal
          prakalpas={prakalpas}
          locations={locations}
          form={form}
          setForm={setForm}
          onClose={() => setShowNewModal(false)}
          onSubmit={handleCreatePlan}
          onPrakalpaChange={handlePrakalpaChange}
          isSubmitting={isSubmitting}
          errorMessage={modalError}
        />
      )}

      {scheduleTarget && (
        <ScheduleModal
          plan={scheduleTarget}
          onClose={() => setScheduleTarget(null)}
          onScheduled={loadAuditPage}
        />
      )}
    </div>
  );
}