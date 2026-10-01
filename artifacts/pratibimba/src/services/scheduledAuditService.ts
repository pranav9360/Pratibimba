import api from "./api";

function withId<T extends Record<string, any>>(
  doc: T
): T {
  if (!doc) return doc;

  return {
    ...doc,
    id:
      doc.id ||
      doc._id,
  };
}

export const getScheduledAudits =
  async () => {
    const res =
      await api.get(
        "/scheduled-audits"
      );

    const data =
      res.data?.data ||
      [];

    return Array.isArray(data)
      ? data.map(withId)
      : data;
  };

export const getScheduledAuditById =
  async (id: string) => {
    const res =
      await api.get(
        `/scheduled-audits/${id}`
      );

    return withId(
      res.data.data
    );
  };

export const updateScheduledAudit =
  async (
    id: string,
    payload: any
  ) => {
    const res =
      await api.put(
        `/scheduled-audits/${id}`,
        payload
      );

    return withId(
      res.data.data
    );
  };

export const markScheduledAuditCompleted =
  async (id: string) => {
    const res =
      await api.patch(
        `/scheduled-audits/${id}/complete`
      );

    return withId(
      res.data.data
    );
  };

export const deleteScheduledAudit =
  async (id: string) => {
    await api.delete(
      `/scheduled-audits/${id}`
    );
  };

export const markMailSent =
  async (id: string) => {
    const res =
      await api.patch(
        `/scheduled-audits/${id}/mail-sent`
      );

    return withId(
      res.data.data
    );
  };

// =========================
// Send IQA / Scheduled Audit Email
// =========================

export interface SendScheduledAuditEmailPayload {
  to: string[];
  cc?: string[];
  subject?: string;
  message?: string;
}

export const sendScheduledAuditEmail =
  async (
    id: string,
    payload: SendScheduledAuditEmailPayload
  ) => {
    const res = await api.post(
      `/scheduled-audits/${id}/send-email`,
      payload
    );

    return withId(res.data.data);
  };
