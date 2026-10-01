import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  submitFindingToLead,
} from "../services/auditFindingService.js";


export const submitAuditFinding =
  asyncHandler(
    async (req, res) => {
      const finding =
        await submitFindingToLead(
          req.body,
          req.user
        );

      res.status(201).json(
        new ApiResponse(
          201,
          "Finding submitted to Lead Auditor successfully",
          finding
        )
      );
    }
  );


export const getAuditFindings =
  asyncHandler(
    async (req, res) => {
      const {
        getAuditFindings:
          getAuditFindingsService,
      } = await import(
        "../services/auditFindingService.js"
      );

      const findings =
        await getAuditFindingsService(
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Audit findings fetched successfully",
          findings
        )
      );
    }
  );


export const getAuditFindingById =
  asyncHandler(
    async (req, res) => {
      const {
        getAuditFindingById:
          getAuditFindingByIdService,
      } = await import(
        "../services/auditFindingService.js"
      );

      const finding =
        await getAuditFindingByIdService(
          req.params.id,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Audit finding fetched successfully",
          finding
        )
      );
    }
  );


export const returnAuditFindingToAuditor =
  asyncHandler(
    async (req, res) => {
      const {
        returnFindingToAuditor,
      } = await import(
        "../services/auditFindingService.js"
      );

      const finding =
        await returnFindingToAuditor(
          req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Finding returned to Auditor successfully",
          finding
        )
      );
    }
  );


export const resubmitAuditFindingToLead =
  asyncHandler(
    async (req, res) => {
      const {
        resubmitFindingToLead,
      } = await import(
        "../services/auditFindingService.js"
      );

      const finding =
        await resubmitFindingToLead(
          req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Finding resubmitted to Lead Auditor successfully",
          finding
        )
      );
    }
  );


export const approveAuditFinding =
  asyncHandler(
    async (req, res) => {
      const {
        approveFindingAndSubmitToCoordinator,
      } = await import(
        "../services/auditFindingService.js"
      );

      const finding =
        await approveFindingAndSubmitToCoordinator(
          req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Finding approved and submitted to Audit Coordinator successfully",
          finding
        )
      );
    }
  );



/*
 * Audit Coordinator generates the official IQR from a finding
 * already submitted by the Lead Auditor.
 */
export const generateReportFromAuditFinding =
  asyncHandler(
    async (req, res) => {
      const {
        convertFindingToReport,
      } = await import(
        "../services/auditFindingService.js"
      );

      const report =
        await convertFindingToReport(
          req.params.id,
          req.user
        );

      res.status(201).json(
        new ApiResponse(
          201,
          "Official IQR generated successfully",
          report
        )
      );
    }
  );
