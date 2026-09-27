import { useEffect, useMemo, useState } from "react";
import {
  createPrakalpa,
  deletePrakalpa,
  getPrakalpas,
  updatePrakalpa,
  type Prakalpa,
} from "../services/prakalpaService";
import {
  createLocation,
  deleteLocation,
  getLocations,
  updateLocation,
  type Location,
} from "../services/locationService";

function getId(item: { _id?: string; id?: string }) {
  return item._id || item.id || "";
}

export default function PrakalpaManagementPage() {
  const [prakalpas, setPrakalpas] = useState<Prakalpa[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showPrakalpaModal, setShowPrakalpaModal] = useState(false);
  const [editingPrakalpa, setEditingPrakalpa] = useState<Prakalpa | null>(null);
  const [prakalpaName, setPrakalpaName] = useState("");
  const [prakalpaPramukh, setPrakalpaPramukh] = useState("");
  const [prakalpaPramukhEmail, setPrakalpaPramukhEmail] = useState("");
  const [seniorEmail, setSeniorEmail] = useState("");
  const [auditAreas, setAuditAreas] = useState<string[]>([]);
  const [auditAreaInput, setAuditAreaInput] = useState("");

  const [locationPrakalpa, setLocationPrakalpa] = useState<Prakalpa | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationName, setLocationName] = useState("");
  const [sublocations, setSublocations] = useState<string[]>([]);
  const [sublocationInput, setSublocationInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [p, l] = await Promise.all([
        getPrakalpas(),
        getLocations(),
      ]);

      setPrakalpas(p);
      setLocations(l);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to load organizational structure."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPrakalpas = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return prakalpas;

    return prakalpas.filter((p) => {
      const locationNames = locations
        .filter((l) => l.prakalpa === p.name)
        .flatMap((l) => [l.name, ...(l.sublocations || [])]);

      return [
        p.name,
        p.prakalpaPramukh || "",
        p.prakalpaPramukhEmail || "",
        p.seniorEmail || "",
        ...(p.auditAreas || []),
        ...locationNames,
      ].some((value) =>
        String(value).toLowerCase().includes(q)
      );
    });
  }, [prakalpas, locations, search]);

  function openCreatePrakalpa() {
    setEditingPrakalpa(null);
    setPrakalpaName("");
    setPrakalpaPramukh("");
    setPrakalpaPramukhEmail("");
    setSeniorEmail("");
    setAuditAreas([]);
    setAuditAreaInput("");
    setError("");
    setShowPrakalpaModal(true);
  }

  function openEditPrakalpa(p: Prakalpa) {
    setEditingPrakalpa(p);
    setPrakalpaName(p.name);
    setPrakalpaPramukh(p.prakalpaPramukh || "");
    setPrakalpaPramukhEmail(p.prakalpaPramukhEmail || "");
    setSeniorEmail(p.seniorEmail || "");
    setAuditAreas(p.auditAreas || []);
    setAuditAreaInput("");
    setError("");
    setShowPrakalpaModal(true);
  }

  function addAuditArea() {
    const value = auditAreaInput.trim();

    if (
      !value ||
      auditAreas.some(
        (area) => area.toLowerCase() === value.toLowerCase()
      )
    ) {
      setAuditAreaInput("");
      return;
    }

    setAuditAreas((prev) => [...prev, value]);
    setAuditAreaInput("");
  }

  async function savePrakalpa() {
    const name = prakalpaName.trim();

    if (!name) {
      setError("Prakalpa name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingPrakalpa) {
        await updatePrakalpa(getId(editingPrakalpa), {
          name,
          prakalpaPramukh: prakalpaPramukh.trim(),
          prakalpaPramukhEmail: prakalpaPramukhEmail.trim(),
          seniorEmail: seniorEmail.trim(),
          auditAreas,
          active: true,
        });
      } else {
        await createPrakalpa({
          name,
          prakalpaPramukh: prakalpaPramukh.trim(),
          prakalpaPramukhEmail: prakalpaPramukhEmail.trim(),
          seniorEmail: seniorEmail.trim(),
          auditAreas,
          active: true,
        });
      }

      setShowPrakalpaModal(false);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to save Prakalpa."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePrakalpa(p: Prakalpa) {
    const relatedLocations = locations.filter(
      (l) => l.prakalpa === p.name
    );

    const message = relatedLocations.length
      ? `Deactivate "${p.name}"? It currently has ${relatedLocations.length} active location(s).`
      : `Deactivate "${p.name}"?`;

    if (!window.confirm(message)) return;

    try {
      await deletePrakalpa(getId(p));
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to deactivate Prakalpa."
      );
    }
  }

  function openCreateLocation(p: Prakalpa) {
    setLocationPrakalpa(p);
    setEditingLocation(null);
    setLocationName("");
    setSublocations([]);
    setSublocationInput("");
    setError("");
  }

  function openEditLocation(p: Prakalpa, l: Location) {
    setLocationPrakalpa(p);
    setEditingLocation(l);
    setLocationName(l.name);
    setSublocations(l.sublocations || []);
    setSublocationInput("");
    setError("");
  }

  function addSublocation() {
    const value = sublocationInput.trim();

    if (
      !value ||
      sublocations.some(
        (sub) => sub.toLowerCase() === value.toLowerCase()
      )
    ) {
      setSublocationInput("");
      return;
    }

    setSublocations((prev) => [...prev, value]);
    setSublocationInput("");
  }

  async function saveLocation() {
    if (!locationPrakalpa) return;

    const name = locationName.trim();

    if (!name) {
      setError("Location name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        prakalpa: locationPrakalpa.name,
        name,
        sublocations,
        active: true,
      };

      if (editingLocation) {
        await updateLocation(getId(editingLocation), payload);
      } else {
        await createLocation(payload);
      }

      setLocationPrakalpa(null);
      setEditingLocation(null);
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to save Location."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeLocation(l: Location) {
    if (!window.confirm(`Deactivate "${l.name}"?`)) return;

    try {
      await deleteLocation(getId(l));
      await loadData();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Unable to deactivate Location."
      );
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="bg-white border border-outline-variant/10 rounded-2xl p-8 shadow-soft">
          <p className="text-on-surface-variant">
            Loading organizational structure...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-label-md font-bold uppercase tracking-wider text-xs mb-2">
            <span className="material-symbols-outlined text-[18px]">
              account_tree
            </span>
            Administration
          </div>

          <h1 className="font-headline-lg text-on-surface">
            Prakalpa Management
          </h1>

          <p className="font-body-md text-on-surface-variant mt-1 max-w-2xl">
            Manage Prakalpas, audit areas, locations and
            sublocations used across audit planning and reporting.
          </p>
        </div>

        <button
          onClick={openCreatePrakalpa}
          className="w-full sm:w-auto px-5 py-3 bg-primary text-on-primary rounded-xl font-label-md font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">
            add
          </span>
          Create Prakalpa
        </button>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 text-error rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-soft border border-outline-variant/10 p-4">
        <div className="relative max-w-xl">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50">
            search
          </span>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Prakalpa, audit area, location or sublocation..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="space-y-5">
        {filteredPrakalpas.map((p) => {
          const pLocations = locations.filter(
            (l) => l.prakalpa === p.name
          );

          const sublocationCount = pLocations.reduce(
            (total, l) => total + (l.sublocations?.length || 0),
            0
          );

          return (
            <section
              key={getId(p) || p.name}
              className="bg-white rounded-2xl shadow-soft border border-outline-variant/10 overflow-hidden"
            >
              <div className="p-5 sm:p-6 border-b border-outline-variant/10">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">
                          corporate_fare
                        </span>
                      </div>

                      <div>
                        <h2 className="font-headline-sm text-on-surface">
                          {p.name}
                        </h2>

                        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-on-surface-variant mt-1">
                          <span>{p.auditAreas?.length || 0} Audit Areas</span>
                          <span>•</span>
                          <span>{pLocations.length} Locations</span>
                          <span>•</span>
                          <span>{sublocationCount} Sublocations</span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-bold uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => openEditPrakalpa(p)}
                      className="px-3 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-low transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        edit
                      </span>
                      Edit
                    </button>

                    <button
                      onClick={() => removePrakalpa(p)}
                      className="px-3 py-2 rounded-lg border border-error/20 text-error hover:bg-error/5 transition-colors text-sm font-medium flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        block
                      </span>
                      Deactivate
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-2">
                    Audit Areas
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {(p.auditAreas || []).length ? (
                      p.auditAreas!.map((area) => (
                        <span
                          key={area}
                          className="px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary text-xs font-medium"
                        >
                          {area}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-on-surface-variant/60">
                        No audit areas configured.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-headline-sm text-on-surface">
                      Locations
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Locations and sublocations belonging to {p.name}.
                    </p>
                  </div>

                  <button
                    onClick={() => openCreateLocation(p)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-secondary text-on-secondary font-label-md font-bold flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      add_location_alt
                    </span>
                    Add Location
                  </button>
                </div>

                {pLocations.length ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                    {pLocations.map((l) => (
                      <div
                        key={getId(l) || l.name}
                        className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-primary text-[19px]">
                                location_on
                              </span>
                              <h4 className="font-label-lg font-bold text-on-surface">
                                {l.name}
                              </h4>
                            </div>

                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {(l.sublocations || []).length ? (
                                l.sublocations!.map((sub) => (
                                  <span
                                    key={sub}
                                    className="px-2.5 py-1 bg-white border border-outline-variant/20 rounded-md text-xs text-on-surface-variant"
                                  >
                                    {sub}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-on-surface-variant/60">
                                  No sublocations
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-1 shrink-0">
                            <button
                              title="Edit location"
                              onClick={() => openEditLocation(p, l)}
                              className="w-9 h-9 rounded-lg hover:bg-primary/10 text-on-surface-variant hover:text-primary flex items-center justify-center"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                edit
                              </span>
                            </button>

                            <button
                              title="Deactivate location"
                              onClick={() => removeLocation(l)}
                              className="w-9 h-9 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error flex items-center justify-center"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                block
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-outline-variant/30 p-7 text-center">
                    <span className="material-symbols-outlined text-[32px] text-on-surface-variant/30">
                      add_location
                    </span>
                    <p className="text-sm text-on-surface-variant mt-2">
                      No locations have been added to this Prakalpa.
                    </p>
                  </div>
                )}
              </div>
            </section>
          );
        })}

        {!filteredPrakalpas.length && (
          <div className="bg-white rounded-2xl border border-outline-variant/10 p-10 text-center shadow-soft">
            <span className="material-symbols-outlined text-[42px] text-on-surface-variant/25">
              account_tree
            </span>
            <h3 className="font-headline-sm mt-3">
              No Prakalpas found
            </h3>
            <p className="text-on-surface-variant text-sm mt-1">
              Create a Prakalpa or change your search.
            </p>
          </div>
        )}
      </div>

      {showPrakalpaModal && (
        <div className="fixed inset-0 z-[100] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 sm:p-6 border-b border-outline-variant/10 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-headline-md">
                  {editingPrakalpa
                    ? "Edit Prakalpa"
                    : "Create Prakalpa"}
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Define the Prakalpa and its audit areas.
                </p>
              </div>

              <button
                onClick={() => setShowPrakalpaModal(false)}
                className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <label className="block font-label-md font-bold mb-2">
                  Prakalpa Name
                </label>
                <input
                  value={prakalpaName}
                  onChange={(e) => setPrakalpaName(e.target.value)}
                  placeholder="Enter Prakalpa name"
                  className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-md font-bold mb-2">
                    Prakalpa Pramukh
                  </label>
                  <input
                    value={prakalpaPramukh}
                    onChange={(e) => setPrakalpaPramukh(e.target.value)}
                    placeholder="Enter Prakalpa Pramukh name"
                    className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-label-md font-bold mb-2">
                    Pramukh Email
                  </label>
                  <input
                    type="email"
                    value={prakalpaPramukhEmail}
                    onChange={(e) => setPrakalpaPramukhEmail(e.target.value)}
                    placeholder="pramukh@example.org"
                    className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md font-bold mb-2">
                  Senior / CC Email
                </label>
                <input
                  type="email"
                  value={seniorEmail}
                  onChange={(e) => setSeniorEmail(e.target.value)}
                  placeholder="senior@example.org"
                  className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1.5">
                  Used when audit communication requires the Prakalpa senior to be copied.
                </p>
              </div>

              <div>
                <label className="block font-label-md font-bold mb-2">
                  Audit Areas
                </label>

                <div className="flex gap-2">
                  <input
                    value={auditAreaInput}
                    onChange={(e) => setAuditAreaInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAuditArea();
                      }
                    }}
                    placeholder="Example: Finance"
                    className="flex-1 min-w-0 border border-outline-variant/30 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />

                  <button
                    type="button"
                    onClick={addAuditArea}
                    className="px-4 rounded-xl bg-secondary text-on-secondary font-bold"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {auditAreas.map((area) => (
                    <span
                      key={area}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary rounded-lg text-sm"
                    >
                      {area}
                      <button
                        type="button"
                        onClick={() =>
                          setAuditAreas((prev) =>
                            prev.filter((a) => a !== area)
                          )
                        }
                        className="flex items-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          close
                        </span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-outline-variant/10 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                onClick={() => setShowPrakalpaModal(false)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/30 font-bold"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                onClick={savePrakalpa}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingPrakalpa
                  ? "Save Changes"
                  : "Create Prakalpa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {locationPrakalpa && (
        <div className="fixed inset-0 z-[110] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 sm:p-6 border-b border-outline-variant/10 flex justify-between gap-4">
              <div>
                <h2 className="font-headline-md">
                  {editingLocation
                    ? "Edit Location"
                    : "Add Location"}
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  {locationPrakalpa.name}
                </p>
              </div>

              <button
                onClick={() => setLocationPrakalpa(null)}
                className="w-9 h-9 rounded-lg hover:bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined">
                  close
                </span>
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-5">
              <div>
                <label className="block font-label-md font-bold mb-2">
                  Location Name
                </label>
                <input
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="Example: Bengaluru"
                  className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block font-label-md font-bold mb-2">
                  Sublocations
                </label>

                <div className="flex gap-2">
                  <input
                    value={sublocationInput}
                    onChange={(e) =>
                      setSublocationInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSublocation();
                      }
                    }}
                    placeholder="Example: Jayanagar"
                    className="flex-1 min-w-0 border border-outline-variant/30 rounded-xl px-4 py-3 outline-none focus:border-primary"
                  />

                  <button
                    type="button"
                    onClick={addSublocation}
                    className="px-4 rounded-xl bg-secondary text-on-secondary font-bold"
                  >
                    Add
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  {sublocations.map((sub) => (
                    <span
                      key={sub}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-lg text-sm"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() =>
                          setSublocations((prev) =>
                            prev.filter((s) => s !== sub)
                          )
                        }
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          close
                        </span>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-outline-variant/10 flex flex-col-reverse sm:flex-row justify-end gap-2">
              <button
                onClick={() => setLocationPrakalpa(null)}
                className="px-5 py-2.5 rounded-xl border border-outline-variant/30 font-bold"
              >
                Cancel
              </button>

              <button
                disabled={saving}
                onClick={saveLocation}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingLocation
                  ? "Save Changes"
                  : "Add Location"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
