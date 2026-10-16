import { fetchWithTimeout, readApiResponse } from "./request-errors";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://pratibimba-backend-final.onrender.com/api/v1";

const BASE_URL = `${API_BASE_URL}/users`;

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

const handleResponse = readApiResponse;

export async function getAuditorDirectory(): Promise<{
  success: boolean;
  data: Array<{ _id: string; name: string }>;
}> {
  const res = await fetchWithTimeout(`${BASE_URL}/auditor-directory`, {
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export interface AuditPerson {
  _id: string;
  name: string;
  role: "auditor" | "audit_coordinator";
}

export async function getAuditPersonDirectory(): Promise<{ success: boolean; data: AuditPerson[] }> {
  const res = await fetchWithTimeout(`${BASE_URL}/audit-directory`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getUsers() {
  const res = await fetchWithTimeout(BASE_URL, {
    headers: authHeaders(),
  });

  return handleResponse(res);
}

export async function createUser(data: any) {
  const res = await fetchWithTimeout(BASE_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(res);
}

export async function updateUser(id: string, data: any) {
  const res = await fetchWithTimeout(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  return handleResponse(res);
}

export async function updateUserRole(id: string, role: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/${id}/role`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });

  return handleResponse(res);
}

export async function deleteUser(id: string, replacementManagerId?: string) {
  const res = await fetchWithTimeout(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
    body: JSON.stringify({ ...(replacementManagerId ? { replacementManagerId } : {}) }),
  });

  return handleResponse(res);
}
