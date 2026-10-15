import { useEffect, useState } from "react";
import { getPrakalpas } from "../../services/prakalpaService";
import { getAuthenticatedUser } from "../../services/authService";
import { assignmentNames } from "./prakalpa-assignments";

export function useManagerPrakalpas(user: { id?: string; role: string; prakalpa?: string; assignedPrakalpas?: string[] }) {
  const [scope, setScope] = useState<{ key: string; names: string[] }>({ key: "", names: [] });
  const key = JSON.stringify([user.id, user.role, assignmentNames(user)]);
  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const load = async () => {
      const request = ++generation;
      setScope({ key, names: [] });
      try {
        const [records, identity] = await Promise.all([getPrakalpas(), getAuthenticatedUser()]);
        if (!cancelled && request === generation) {
          const active = new Set(records.filter(p => p.active !== false).map(p => p.name));
          setScope({ key, names: identity.role === "prakalpa_manager" ? assignmentNames(identity).filter(name => active.has(name)) : [] });
        }
      } catch { if (!cancelled && request === generation) setScope({ key, names: [] }); }
    };
    if (user.role === "prakalpa_manager") {
      void load(); window.addEventListener("focus", load);
    }
    return () => { cancelled = true; window.removeEventListener("focus", load); };
  }, [user.role, key]);
  return scope.key === key ? scope.names : [];
}
