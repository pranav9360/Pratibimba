import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import * as reportService from "../services/reportService.js";

export const createReport = asyncHandler(async (req, res) => {
  const report = await reportService.createReport(
    req.body,
    req.user
  );

  res.status(201).json(
    new ApiResponse(
      201,
      "Report created successfully",
      report
    )
  );
});

export const getReports = asyncHandler(async (req, res) => {
  const reports = await reportService.getReports(
    req.user
  );

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
      req.params.id,
      req.user
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
        req.params.id,
        req.user
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
// Send Report Email
// ==============================

export const sendReportEmail = asyncHandler(async (req, res) => {
  const report = await reportService.sendReportEmail(
    req.params.id,
    req.body,
    req.user
  );

  res.json(
    new ApiResponse(
      200,
      "Report email sent successfully",
      report
    )
  );
});

// ==============================
// Send all IQRs under one IQA
// ==============================

export const sendIQAReportsEmail = asyncHandler(
  async (req, res) => {
    const result =
      await reportService.sendIQAReportsEmail(
        req.params.iqaNumber,
        req.body,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "IQA reports email sent successfully",
        result
      )
    );
  }
);



// ==============================
// Send official IQR to Prakalpa
// ==============================

export const sendReportToPrakalpa =
  asyncHandler(
    async (req, res) => {
      const report =
        await reportService.sendReportToPrakalpa(
          req.params.id,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "IQR sent to Prakalpa successfully",
          report
        )
      );
    }
  );


// ==============================
// Prakalpa corrective action
// ==============================

export const submitPrakalpaCorrectiveAction =
  asyncHandler(
    async (req, res) => {
      const report =
        await reportService.submitPrakalpaCorrectiveAction(
          req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Corrective action submitted successfully",
          report
        )
      );
    }
  );

export const updateReport = asyncHandler(async (req, res) => {

  const report =
    await reportService.updateReport(
      req.params.id,
      req.body,
      req.user
    );

  res.json(
    new ApiResponse(
      200,
      "Report updated successfully",
      report
    )
  );

});

// ==============================
// Return action to Prakalpa
// ==============================

export const returnReportToPrakalpa =
  asyncHandler(
    async (req, res) => {
      const report =
        await reportService.returnReportToPrakalpa(
          req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Corrective action returned to Prakalpa successfully",
          report
        )
      );
    }
  );


// ==============================
// Verify action and close IQR
// ==============================

export const verifyAndCloseReport =
  asyncHandler(
    async (req, res) => {
      const report =
        await reportService.verifyAndCloseReport(
          req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Corrective action verified and IQR closed successfully",
          report
        )
      );
    }
  );
