import { useState } from "react";
import { useApp, PRAKALPAS } from "../context/app-context";

export default function LeadAuditorAssignmentsPage() {
  const { leadAuditorProfiles, updateLeadAuditorProfile } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPrakalpas, setSelectedPrakalpas] = useState<string[]>([]);

  const startEdit = (id: string) => {
    const profile = leadAuditorProfiles.find((item) => item.id === id);
    if (!profile) return;
    setEditingId(id);
    setSelectedPrakalpas([...profile.prakalpas]);
  };

  const togglePrakalpa = (name: string) => {
    setSelectedPrakalpas((previous) =>
      previous.includes(name)
        ? previous.filter((item) => item !== name)
        : [...previous, name]
    );
  };

  const save = () => {
    if (!editingId) return;
    updateLeadAuditorProfile(editingId, { prakalpas: selectedPrakalpas });
    setEditingId(null);
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <h1 className="font-headline-md font-bold text-on-surface">Lead Auditor Assignments</h1>
        <p className="mt-1 font-body-md text-on-surface-variant">Manage the Prakalpa assignments shown for lead auditors.</p>
      </header>
      <div className="divide-y divide-outline-variant/10 overflow-hidden rounded-xl border border-outline-variant/20 bg-white shadow-sm">
        {leadAuditorProfiles.map((profile) => (
          <section key={profile.id} className="p-5">
            {editingId === profile.id ? (
              <div className="space-y-4">
                <div>
                  <h2 className="font-label-md font-bold text-on-surface">{profile.name}</h2>
                  <p className="text-xs text-on-surface-variant">{profile.email}</p>
                </div>
                <p className="text-sm text-on-surface-variant">Select Prakalpas to assign:</p>
                <div className="flex flex-wrap gap-2">
                  {PRAKALPAS.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => togglePrakalpa(name)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${selectedPrakalpas.includes(name) ? "border-primary bg-primary text-on-primary" : "border-outline-variant text-on-surface-variant"}`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-outline-variant px-4 py-2 text-sm">Cancel</button>
                  <button type="button" onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-on-primary">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <h2 className="font-label-md font-bold text-on-surface">{profile.name}</h2>
                  <p className="text-xs text-on-surface-variant">{profile.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {profile.prakalpas.length === 0 ? (
                      <span className="text-xs italic text-on-surface-variant">No Prakalpas assigned</span>
                    ) : profile.prakalpas.map((name) => (
                      <span key={name} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{name}</span>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={() => startEdit(profile.id)} className="rounded-lg border border-outline-variant px-3 py-2 text-xs font-bold hover:bg-surface-container-low">
                  Edit Prakalpas
                </button>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
