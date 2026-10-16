import { getRequestErrorMessage, REQUEST_TIMEOUT_MS } from "../services/request-errors";
import { useEffect, useState } from "react";
import { useApp } from "../context/app-context";
import { getMyPrakalpas, type MyPrakalpa } from "../services/prakalpaService";

export default function MyPrakalpasPage() {
  const { currentUser } = useApp();
  const [state, setState] = useState<{ identity: string; loading: boolean; error: string; projects: MyPrakalpa[] }>({
    identity: "", loading: true, error: "", projects: [],
  });
  const [attempt, setAttempt] = useState(0);
  const identity = JSON.stringify([currentUser.id, currentUser.role, currentUser.prakalpa, currentUser.assignedPrakalpas]);
  useEffect(() => {
    if (currentUser.role !== "prakalpa_manager") return;
    let cancelled = false;
    const controller = new AbortController();
    let expired = false;
    setState({ identity, loading: true, error: "", projects: [] });
    const timer = setTimeout(() => {
      expired = true;
      controller.abort();
      if (!cancelled) setState({ identity, loading: false, error: "The request took too long. Check your connection and try again.", projects: [] });
    }, REQUEST_TIMEOUT_MS);
    void getMyPrakalpas({ signal: controller.signal }).then(projects => {
      if (!cancelled && !expired) setState({ identity, loading: false, error: "", projects });
    }).catch(error => {
      if (!cancelled && !expired) setState({ identity, loading: false,
        error: getRequestErrorMessage(error, "Unable to load your Prakalpas. Please try again. If the problem continues, contact your Superadmin."), projects: [] });
    }).finally(() => clearTimeout(timer));
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [identity, currentUser.role, attempt]);

  if (currentUser.role !== "prakalpa_manager") {
    return <div role="alert" className="p-6 text-on-surface">Only Prakalpa Managers can view My Prakalpas.</div>;
  }
  const pending = state.identity !== identity || state.loading;
  return <section className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 md:p-8">
    <header>
      <h1 className="font-headline-md text-on-surface">My Prakalpas</h1>
      <p className="mt-1 font-body-md text-on-surface-variant">View the active Prakalpas assigned to you. For assignment or contact changes, contact your Superadmin.</p>
    </header>
    {pending ? <p role="status" className="rounded-xl bg-surface p-6">Loading your Prakalpas…</p>
      : state.error ? <div role="alert" className="rounded-xl border border-outline-variant bg-surface p-6">
        <p>{state.error}</p>
        <button type="button" onClick={() => setAttempt(value => value + 1)} className="mt-4 rounded-lg bg-primary px-4 py-2 font-label-md text-on-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Retry</button>
      </div> : state.projects.length === 0 ? <p role="status" className="rounded-xl border border-outline-variant bg-surface p-6">No eligible active Prakalpas are assigned to you. Contact your Superadmin for assistance.</p>
      : <div className="grid gap-4 md:grid-cols-2">{state.projects.map(project => <article key={project.name} className="min-w-0 rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-sm">
        <h2 className="break-words font-headline-sm text-on-surface">{project.name}</h2>
        <p className="mt-2 text-sm font-bold text-primary">{project.active ? "Active" : "Inactive"}</p>
        <details className="mt-4">
          <summary className="cursor-pointer rounded-lg py-2 font-label-md text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">View Prakalpa details</summary>
          <dl className="mt-3 space-y-3 break-words font-body-md">
            <div><dt className="font-bold">Pramukh</dt><dd>{project.prakalpaPramukh || "Not provided"}</dd></div>
            <div><dt className="font-bold">Pramukh email</dt><dd>{project.prakalpaPramukhEmail || "Not provided"}</dd></div>
            <div><dt className="font-bold">Senior contact email</dt><dd>{project.seniorEmail || "Not provided"}</dd></div>
            <div><dt className="font-bold">Audit areas</dt><dd>{project.auditAreas.join(", ") || "Not provided"}</dd></div>
            <div><dt className="font-bold">Locations and sublocations</dt><dd>{project.locations.length ? <ul className="mt-1 space-y-2">{project.locations.map(location => <li key={location.name}>
              <span className="font-medium">{location.name}</span>{location.sublocations.length > 0 && <ul className="list-inside list-disc pl-3">{location.sublocations.map(name => <li key={name}>{name}</li>)}</ul>}
            </li>)}</ul> : "No active locations provided"}</dd></div>
          </dl>
        </details>
      </article>)}</div>}
  </section>;
}
