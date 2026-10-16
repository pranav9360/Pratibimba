import { sortAuditRecords } from "../../../../shared/audit-order.mjs";
import api from "./api";
import type { ScheduledAudit } from "../context/app-context";

function withId<T extends object>(
  doc: T
): T {
  if (!doc) return doc;

  const record = doc as T & { id?: string; _id?: string };

  return {
    ...record,
    id: record.id || record._id,
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
      ? sortAuditRecords(data.map(withId))
      : data;
  };

export const getScheduledAuditById =
  async (id: string): Promise<ScheduledAudit> => {
    const res =
      await api.get(
        `/scheduled-audits/${id}`
      );

    const audit = res.data?.data;
    if (!audit || typeof audit !== "object") {
      throw new Error("Scheduled Audit response was invalid.");
    }

    return withId(audit) as ScheduledAudit;
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

export const getCompletionEligibility = async (): Promise<Record<string, {eligible:boolean;reason:string}>> => {
  const res = await api.get("/scheduled-audits/completion-eligibility");
  return res.data.data;
};
