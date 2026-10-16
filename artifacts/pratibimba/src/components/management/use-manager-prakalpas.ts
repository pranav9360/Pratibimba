import { useEffect, useState } from "react";
import { getMyPrakalpas } from "../../services/prakalpaService";
import { getRequestErrorMessage } from "../../services/request-errors";

type ManagerIdentity = { id?: string; role: string; prakalpa?: string; assignedPrakalpas?: string[] };
export function useManagerPrakalpaScope(user: ManagerIdentity) {
  const [scope, setScope] = useState({ key: "", names: [] as string[], loading: false, error: "" });
  const key = JSON.stringify([user.id, user.role, user.prakalpa, user.assignedPrakalpas]);
  useEffect(() => {
    if (user.role !== "prakalpa_manager") return;
    let cancelled = false;
    const controller = new AbortController();
    setScope({ key, names: [], loading: true, error: "" });
    getMyPrakalpas({ signal: controller.signal }).then(records => {
      if (!cancelled) setScope({ key, names: [...new Set(records.filter(p => p.active).map(p => p.name))], loading: false, error: "" });
    }).catch(error => {
      if (!cancelled) setScope({ key, names: [], loading: false,
        error: getRequestErrorMessage(error, "Unable to verify your Prakalpa access. Refresh the page and try again.") });
    });
    return () => { cancelled = true; controller.abort(); };
  }, [user.role, key]);
  return scope.key === key ? scope : { key, names: [], loading: user.role === "prakalpa_manager", error: "" };
}

export function useManagerPrakalpas(user: ManagerIdentity) {
  return useManagerPrakalpaScope(user).names;
}
