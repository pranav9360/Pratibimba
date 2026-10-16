import api from "./api";
import { ApiRequestError } from "./request-errors";

export interface Prakalpa {
  _id?: string;
  id?: string;
  name: string;
  auditAreas?: string[];
  prakalpaPramukh?: string;
  prakalpaPramukhEmail?: string;
  seniorEmail?: string;
  assignedManagerName?: string;
  assignedManagerId?: string;
  assignedManagerEmail?: string;
  managerAssignmentStatus?: "resolved" | "missing" | "ambiguous" | "conflicting";
  historicalContactMismatch?: boolean;
  active?: boolean;
}

export interface PrakalpaPayload {
  name: string;
  initialLocation?: string;
  auditAreas?: string[];
  prakalpaPramukh?: string;
  prakalpaPramukhEmail?: string;
  seniorEmail?: string;
  active?: boolean;
  managerId?: string;
}

export interface MyPrakalpa {
  name: string;
  active: boolean;
  auditAreas: string[];
  prakalpaPramukh: string;
  prakalpaPramukhEmail: string;
  seniorEmail: string;
  locations: { name: string; sublocations: string[] }[];
}

export async function getMyPrakalpas(options: { signal?: AbortSignal } = {}): Promise<MyPrakalpa[]> {
  const res = await api.get("/prakalpas/mine", { signal: options.signal });
  const records = res.data?.data;
  if (!Array.isArray(records) || records.some((p: any) => !p || typeof p.name !== "string" ||
    typeof p.active !== "boolean" || !Array.isArray(p.auditAreas) || p.auditAreas.some((a: unknown) => typeof a !== "string") ||
    !Array.isArray(p.locations) || p.locations.some((l: any) => !l || typeof l.name !== "string" ||
      !Array.isArray(l.sublocations) || l.sublocations.some((n: unknown) => typeof n !== "string")))) {
    throw new ApiRequestError(502, null);
  }
  return res.data.data;
}

export const getPrakalpas =
  async (includeInactive = false): Promise<Prakalpa[]> => {
    const res = await api.get(includeInactive ? "/prakalpas?includeInactive=true" : "/prakalpas");
    if (!Array.isArray(res.data?.data)) throw new Error("Invalid Prakalpa response.");
    return res.data.data;
  };

export const createPrakalpa =
  async (data: PrakalpaPayload) => {
    const res = await api.post("/prakalpas", data);
    return res.data?.data;
  };

export const updatePrakalpa =
  async (
    id: string,
    data: Partial<PrakalpaPayload>
  ) => {
    const res = await api.put(`/prakalpas/${id}`, data);
    return res.data?.data;
  };

export const deletePrakalpa =
  async (id: string) => {
    const res = await api.delete(`/prakalpas/${id}`);
    return res.data?.data;
  };
