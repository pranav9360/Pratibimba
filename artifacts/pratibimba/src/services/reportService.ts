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

export const sendIQAReportsEmail = async (
  iqaNumber: string,
  payload: SendReportEmailPayload & {
    reportIds: string[];
  }
) => {
  const res = await api.post(
    `/reports/iqa/${encodeURIComponent(iqaNumber)}/send-email`,
    payload
  );

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

// =========================
// Official IQR → Prakalpa
// =========================

/*
 * Assigned Audit Coordinator formally releases a
 * coordinator-generated official IQR to the Prakalpa.
 */
export const sendReportToPrakalpa = async (
  id: string
) => {
  const res = await api.patch(
    `/reports/${id}/send-to-prakalpa`
  );

  return res.data.data;
};


// =========================
// Prakalpa Corrective Action
// =========================

export const submitPrakalpaCorrectiveAction = async (
  id: string,
  data: {
    actionTaken: string;
    completionRemarks?: string;
    proofFiles?: string[];
  }
) => {
  const res = await api.patch(
    `/reports/${id}/submit-action`,
    data
  );

  return res.data.data;
};


// ===================================
// Coordinator Corrective-Action Review
// ===================================

export interface CoordinatorVerificationPayload {
  remarks?: string;
  coordinatorVerificationRemarks?: string;
}


/*
 * Assigned Audit Coordinator returns a submitted corrective
 * action to the Prakalpa for further correction.
 */
export const returnReportToPrakalpa = async (
  id: string,
  data: CoordinatorVerificationPayload
) => {
  const res = await api.patch(
    `/reports/${id}/return-to-prakalpa`,
    data
  );

  return res.data.data;
};


/*
 * Assigned Audit Coordinator accepts the corrective action
 * and formally closes the IQR.
 */
export const verifyAndCloseReport = async (
  id: string,
  data: CoordinatorVerificationPayload = {}
) => {
  const res = await api.patch(
    `/reports/${id}/verify-close`,
    data
  );

  return res.data.data;
};
