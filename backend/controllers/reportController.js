import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import * as reportService from "../services/reportService.js";

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(req.body);

  res.status(201).json(
    new ApiResponse(
      201,
      "Report created successfully",
      report
    )
  );
});

export const getReports = asyncHandler(async (req, res) => {
  const reports = await reportService.getReports();

  res.json(
    new ApiResponse(
      200,
      "Reports fetched successfully",
      reports
    )
  );
});

export const getReportById = asyncHandler(async (req, res) => {
  const report =
    await reportService.getReportById(
      req.params.id
    );

  res.json(
    new ApiResponse(
      200,
      "Report fetched successfully",
      report
    )
  );
});

export const downloadReportPDF = asyncHandler(
  async (req, res) => {
    const doc =
      await reportService.generateReportPDF(
        req.params.id
      );

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-report-${req.params.id}.pdf"`
    );

    doc.pipe(res);
  }
);

// ==============================
// Close Report
// ==============================

export const closeReport = asyncHandler(async (req, res) => {
  const report =
    await reportService.closeReport(
      req.params.id,
      req.body,
      req.user
    );

  res.json(
    new ApiResponse(
      200,
      "Report closed successfully",
      report
    )
  );
});

// ==============================
// Send Report Email
// ==============================

export const sendReportEmail = asyncHandler(async (req, res) => {
  const report = await reportService.sendReportEmail(
    req.params.id,
    req.body
  );

  res.json(
    new ApiResponse(
      200,
      "Report email sent successfully",
      report
    )
  );
});

export const updateReport = asyncHandler(async (req, res) => {

  const report =
    await reportService.updateReport(
      req.params.id,
      req.body
    );

  res.json(
    new ApiResponse(
      200,
      "Report updated successfully",
      report
    )
  );

});