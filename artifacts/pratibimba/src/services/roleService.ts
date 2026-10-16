import api from "./api";

// Configuration only; backend role/assignment policies remain authoritative.
export async function getRoles(includeInactive = false): Promise<StoredRole[]> {
  const res = await api.get("/roles", { params: includeInactive ? { includeInactive: true } : {} });
  return res.data.data;
}

export type StoredRole = {
  _id: string;
  name: string;
  active: boolean;
  permissions: Record<string, boolean>;
};

export async function updateRole(id: string, data: { permissions?: Record<string, boolean>; name?: string; active?: boolean }) {
  const res = await api.put(`/roles/${id}`, data);
  return res.data.data as StoredRole;
}

export async function createRole(name: string) {
  const res = await api.post("/roles", { name });
  return res.data.data as StoredRole;
}

export async function deleteRole(id: string) {
  await api.delete(`/roles/${id}`);
}
