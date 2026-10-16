import { useEffect, useState } from "react";
import { getPrakalpas, type Prakalpa } from "../../services/prakalpaService";

type AssignmentUser = { prakalpa?: string; assignedPrakalpas?: string[] };
export function assignmentNames(user: AssignmentUser): string[] {
  const raw = user.assignedPrakalpas ?? [];
  if (!Array.isArray(raw) || raw.some(name => typeof name !== "string" || !name.trim())) return [];
  const names = [...new Set(raw.map(name => name.trim()))];
  if (names.length) return user.prakalpa?.trim() && !names.includes(user.prakalpa.trim()) ? [] : names;
  return user.prakalpa?.trim() ? [user.prakalpa.trim()] : [];
}

export function PrakalpaAssignments({ value, onChange, onReady, managers = [], userId }: {
  value: string[]; onChange: (names: string[]) => void; onReady?: (ready: boolean) => void;
  managers?: Array<AssignmentUser & { id: string; role: string; active: boolean }>; userId?: string;
}) {
  const [projects, setProjects] = useState<Prakalpa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(""); onReady?.(false);
    getPrakalpas().then(records => {
      if (!Array.isArray(records)) throw new Error("Invalid Prakalpa response.");
      if (!cancelled) { setProjects(records.filter(p => p.active !== false)); onReady?.(true); }
    }).catch(() => {
      if (!cancelled) { setProjects([]); setError("Unable to load Prakalpas. Retry before changing assignments."); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [attempt, onReady]);
  return <fieldset className="space-y-2 rounded-xl border border-outline-variant p-3">
    <legend className="px-1 font-label-md">Assigned Prakalpas</legend>
    {loading ? <p role="status">Loading Prakalpas…</p> : error ? <p role="alert">{error}</p> : <>
      <input aria-label="Search assignment Prakalpas" value={search} onChange={event => setSearch(event.target.value)}
        className="w-full rounded-lg border px-3 py-2" placeholder="Search Prakalpas" />
      {projects.length === 0 && <p>No active Prakalpas available. Create this Manager account, then assign it in Prakalpa Management.</p>}
      <div className="space-y-1">
        {projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => {
          const unavailable = managers.some(manager => manager.active && manager.role === "prakalpa_manager" && manager.id !== userId &&
            [manager.prakalpa, ...(manager.assignedPrakalpas || [])].includes(p.name));
          return <label key={p._id || p.name} className="flex items-center gap-2 py-2">
          <input type="checkbox" disabled={unavailable} checked={value.includes(p.name)} onChange={event => onChange(event.target.checked ? [...new Set([...value, p.name])] : value.filter(name => name !== p.name))} />{p.name}{unavailable ? " — assigned to another Manager; reassign in Prakalpa Management" : ""}
        </label>; })}
      </div>
    </>}
    <div className="flex flex-wrap gap-2">{value.map(name => <button key={name} type="button" aria-label={`Remove ${name} assignment`} onClick={() => onChange(value.filter(item => item !== name))}
      className="rounded-full border px-2 py-1 text-sm">{name} ×</button>)}</div>
    <button type="button" disabled={loading} onClick={() => setAttempt(n => n + 1)} className="text-primary underline">{error ? "Retry" : "Refresh Prakalpas"}</button>
  </fieldset>;
}
