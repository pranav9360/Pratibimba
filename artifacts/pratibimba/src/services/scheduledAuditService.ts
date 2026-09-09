import api from "./api";

// The ScheduledAudit Mongoose schema (unlike AuditPlan) does not enable
// `toJSON: { virtuals: true }`, so the API response only carries `_id`,
// not `.id`. Normalize once here so `.id` is always populated and
// `undefined` never leaks into a request URL downstream.
function withId<T extends Record<string, any>>(doc: T): T {
  if (!doc) return doc;
  return { ...doc, id: doc.id || doc._id };
}

export const getScheduledAudits = async () => {
  const res = await api.get("/scheduled-audits");
  const data = res.data.data;
  return Array.isArray(data) ? data.map(withId) : data;
};

export const getScheduledAuditById = async (id: string) => {
  const res = await api.get(`/scheduled-audits/${id}`);
  return withId(res.data.data);
};

export const createScheduledAudit = async (payload: any) => {
  const res = await api.post("/scheduled-audits", payload);
  return withId(res.data.data);
};

export const updateScheduledAudit = async (
  id: string,
  payload: any
) => {
  const res = await api.put(
    `/scheduled-audits/${id}`,
    payload
  );

  return withId(res.data.data);
};

export const deleteScheduledAudit = async (
  id: string
) => {
  await api.delete(`/scheduled-audits/${id}`);
};

export const markMailSent = async (id: string) => {
  const res = await api.patch(
    `/scheduled-audits/${id}/mail-sent`
  );

  return res.data.data;
};