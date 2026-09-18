import api from "./api";

// =========================
// Reports
// =========================

export const getReports = async () => {
  const res = await api.get("/reports");
  return res.data.data;
};

export const getReportById = async (id: string) => {
  const res = await api.get(`/reports/${id}`);
  return res.data.data;
};

export const createReport = async (data: any) => {
  const res = await api.post("/reports", data);
  return res.data.data;
};

// =========================
// Send Report Email
// =========================

export interface SendReportEmailPayload {
  to: string[];
  cc?: string[];
  subject?: string;
  message?: string;
}

export const sendReportEmail = async (
  id: string,
  payload: SendReportEmailPayload
) => {
  const res = await api.post(`/reports/${id}/send-email`, payload);
  return res.data.data;
};

export const downloadReportPDF = async (id: string) => {
  const response = await api.get(`/reports/${id}/pdf`, {
    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `audit-report-${id}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);

  return {
    success: true,
  };
};

// =========================
// Close Report
// =========================

export const closeReport = async (
  id: string,
  data: {
    actionTaken: string;
    completionRemarks?: string;
    closedBy?: string;
    closedAt?: string;
    proofFiles?: string[];
  }
) => {
  const res = await api.patch(`/reports/${id}/close`, data);
  return res.data.data;
};

// =========================
// Update Report
// =========================

export const updateReport = async (
  id: string,
  data: {
    findings?: string;
    severity?: string;
    actionTaken?: string;
    completionRemarks?: string;
    status?: string;
  }
) => {
  const res = await api.patch(`/reports/${id}`, data);
  return res.data.data;
};