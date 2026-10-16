export const REQUEST_TIMEOUT_MS = 15_000;

export class ApiRequestError extends Error {
  constructor(public status: number, public data: unknown) {
    super("API request failed");
  }
}

export function requestStatus(error: any): number | undefined {
  return error?.response?.status ?? error?.status;
}

function publicMessage(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim() || value.length > 700) return;
  if (/mongodb(?:\+srv)?:|\b(?:MongoServerError|MongooseError|CastError|E11000|stack trace)\b|Bearer\s|\bat\s+\S+\s*\([^)]*:\d+|eyJ[A-Za-z0-9_-]+\./i.test(value)) return;
  return value.trim();
}

export function getRequestErrorMessage(error: any, fallback = "Unable to complete the request. Please try again."): string {
  const status = requestStatus(error);
  const data = error?.response?.data ?? error?.data;
  if (status === 401) return "Your session has expired or is invalid. Please sign in again.";
  if (status === 403) return "You do not have permission to perform this action. Contact your Super Admin if you need access.";
  if (status === 404) return "The requested record could not be found. Refresh the page and try again.";
  if (status === 429) return "Too many requests. Please wait before trying again.";
  if (status && status >= 500) return "The server could not complete your request. Please try again later.";
  if (status === 400 || status === 409) {
    const details = Array.isArray(data?.errors) ? data.errors.map((item: any) => publicMessage(item?.msg)).filter(Boolean).slice(0, 3).join(" ") : "";
    return details || publicMessage(data?.message) || (status === 409
      ? "This change conflicts with the current record or its assignments. Review the record before saving again."
      : "Please check the form values and try again.");
  }
  if (["ECONNABORTED", "ETIMEDOUT"].includes(error?.code) || ["TimeoutError", "AbortError"].includes(error?.name)) {
    const method = String(error?.config?.method || error?.requestMethod || "GET").toUpperCase();
    return ["POST", "PUT", "PATCH", "DELETE"].includes(method)
      ? "The request took too long. Refresh the record to check whether your change was saved before trying again."
      : "The request took too long. Check your connection and try again.";
  }
  return fallback;
}

export function handleUnauthorized(status: number, url = "") {
  if (status !== 401 || url.includes("/auth/login") || typeof window === "undefined") return;
  if (!localStorage.getItem("token")) return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  if (window.location.pathname !== "/login") window.location.replace("/login");
}

export function logRequestError(context: string, error: unknown) {
  // Error objects from HTTP clients may contain Authorization headers and payloads.
  console.error(context, { status: requestStatus(error) ?? "network" });
}

export async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const deadline = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = init.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  try { return await fetch(input, { ...init, signal }); }
  catch (error) {
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) {
      Object.assign(error, { requestMethod: init.method || "GET" });
    }
    throw error;
  }
}

export async function readApiResponse(res: Response) {
  handleUnauthorized(res.status, res.url);
  let data;
  try { data = await res.json(); }
  catch { throw new ApiRequestError(res.ok ? 502 : res.status, null); }
  if (!res.ok) throw new ApiRequestError(res.status, data);
  return data;
}
