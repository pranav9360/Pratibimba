const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://pratibimba-backend-final.onrender.com/api/v1";

const BASE_URL = `${API_BASE_URL}/audit-plans`;

function authHeaders() {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res: Response) {
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

// AuditPlan's Mongoose schema already exposes a virtual `id` (and
// `toJSON: { virtuals: true }`), so `.id` should normally be present.
// This is a defensive fallback only, so a future schema change can never
// let `undefined` leak into a request URL downstream.
function withId<T extends Record<string, any>>(doc: T): T {
  if (!doc) return doc;
  return { ...doc, id: doc.id || doc._id };
}

function normalizePlansResponse(response: any) {
  if (response && Array.isArray(response.data)) {
    return { ...response, data: response.data.map(withId) };
  }
  return response;
}

export async function getAuditPlans() {
  const res = await fetch(BASE_URL, {
    headers: authHeaders(),
  });

  const response = await handleResponse(res);
  return normalizePlansResponse(response);
}

export async function createAuditPlan(data: any) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  const response = await handleResponse(res);
  return withId(response.data);
}

export async function updateAuditPlan(id: string, data: any) {
  const resolvedId = id || (data && (data.id || data._id));

  if (!resolvedId) {
    throw new Error("updateAuditPlan: missing audit plan id");
  }

  const res = await fetch(`${BASE_URL}/${resolvedId}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  const response = await handleResponse(res);
  return withId(response.data);
}

export async function deleteAuditPlan(id: string) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  const response = await handleResponse(res);
  return response.data;
}

export async function scheduleAudit(id: string, data: any) {
  if (!id) {
    throw new Error("scheduleAudit: missing audit plan id");
  }
  const res = await fetch(`${BASE_URL}/${id}/schedule`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });

  const response = await handleResponse(res);
  return withId(response.data);
}
