import api from "./api";

export interface Prakalpa {
  _id?: string;
  id?: string;
  name: string;
  auditAreas?: string[];
  prakalpaPramukh?: string;
  prakalpaPramukhEmail?: string;
  seniorEmail?: string;
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
  newManager?: { name: string; email: string; password: string };
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
