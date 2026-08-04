import api from "./api";

export const getAuditPlans = async () => {
  const res = await api.get("/audit-plans");
  return res.data.data;
};

export const createAuditPlan = async (payload: any) => {
  const res = await api.post("/audit-plans", payload);
  return res.data.data;
};

export const updateAuditPlan = async (
  id: string,
  payload: any
) => {
  const res = await api.put(`/audit-plans/${id}`, payload);
  return res.data.data;
};

export const deleteAuditPlan = async (id: string) => {
  await api.delete(`/audit-plans/${id}`);
};

export const scheduleAudit = async (
  id: string,
  payload: any
) => {
  const res = await api.put(
    `/audit-plans/${id}/schedule`,
    payload
  );

  return res.data.data;
};