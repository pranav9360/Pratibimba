import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import {
  createAuditFindingDraft,
  getAuditorSubmissionStatus,
  submitAllAuditorFindings,
  getScheduledAuditFindings,
  updateAuditFindingDraft,
  submitAuditFindingDraft,
  submitFindingToLead,
  listEligibleSubmittedFindingsForAudit,
  listConsolidatedFindingsForAudit,
  createConsolidatedFinding,
  getConsolidatedFindingById,
  updateConsolidatedFindingDraft,
  submitConsolidatedFinding,
  submitAllConsolidatedFindingsForAudit,
  listCoordinatorConsolidatedInbox,
  editCoordinatorConsolidatedFinding,
  reviewCoordinatorConsolidatedClassification,
  convertConsolidatedFindingToReport,
} from "../services/auditFindingService.js";


export const getAuditorBatchStatusController = asyncHandler(async (req, res) => {
  const result = await getAuditorSubmissionStatus(req.params.scheduledAuditId, req.user);
  res.json(new ApiResponse(200, "Auditor batch status", result));
});
export const submitAllAuditorFindingsController = asyncHandler(async (req, res) => {
  if (req.body?.confirmed !== true) throw new Error("Confirmation acknowledgement is required.");
  const result = await submitAllAuditorFindings(req.params.scheduledAuditId, req.user);
  res.json(new ApiResponse(200, "All findings submitted to Lead Auditor", result));
});

export const createAuditFinding =
  asyncHandler(
    async (req, res) => {
      const finding =
        await createAuditFindingDraft(
          req.params.scheduledAuditId ||
            req.body.scheduledAudit,
          req.body,
          req.user
        );

      res.status(201).json(
        new ApiResponse(
          201,
          "Audit finding draft created successfully",
          finding
        )
      );
    }
  );


export const listScheduledAuditFindings =
  asyncHandler(
    async (req, res) => {
      const findings =
        await getScheduledAuditFindings(
          req.params.scheduledAuditId,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Scheduled audit findings fetched successfully",
          findings
        )
      );
    }
  );


export const editAuditFinding =
  asyncHandler(
    async (req, res) => {
      const finding =
        await updateAuditFindingDraft(
          req.params.findingId || req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Audit finding draft updated successfully",
          finding
        )
      );
    }
  );


export const submitDraftAuditFinding =
  asyncHandler(
    async (req, res) => {
      const finding =
        await submitAuditFindingDraft(
          req.params.findingId || req.params.id,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Audit finding submitted successfully",
          finding
        )
      );
    }
  );


export const submitAuditFindingToLead =
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

export const listEligibleConsolidatedFindings =
  asyncHandler(
    async (req, res) => {
      const findings =
        await listEligibleSubmittedFindingsForAudit(
          req.params.scheduledAuditId,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Eligible submitted findings fetched successfully",
          findings
        )
      );
    }
  );

export const listScheduledAuditConsolidatedFindings =
  asyncHandler(
    async (req, res) => {
      const findings =
        await listConsolidatedFindingsForAudit(
          req.params.scheduledAuditId,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Consolidated findings fetched successfully",
          findings
        )
      );
    }
  );

export const createConsolidatedFindingController =
  asyncHandler(
    async (req, res) => {
      const finding =
        await createConsolidatedFinding(
          req.params.scheduledAuditId,
          req.body,
          req.user
        );

      res.status(201).json(
        new ApiResponse(
          201,
          "Consolidated finding created successfully",
          finding
        )
      );
    }
  );

export const getConsolidatedFindingController =
  asyncHandler(
    async (req, res) => {
      const finding =
        await getConsolidatedFindingById(
          req.params.id,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Consolidated finding fetched successfully",
          finding
        )
      );
    }
  );

export const updateConsolidatedFindingController =
  asyncHandler(
    async (req, res) => {
      const finding =
        await updateConsolidatedFindingDraft(
          req.params.id,
          req.body,
          req.user
        );

      res.json(
        new ApiResponse(
          200,
          "Consolidated finding updated successfully",
          finding
        )
      );
    }
  );


export const submitAllConsolidatedFindingsController =
  asyncHandler(async (req, res) => {
    const findings = await submitAllConsolidatedFindingsForAudit(
      req.params.scheduledAuditId,
      req.user,
      req.body || {}
    );

    res.json(
      new ApiResponse(
        200,
        "All consolidated findings submitted to Coordinator successfully",
        findings
      )
    );
  });

export const submitConsolidatedFindingController =
  asyncHandler(
    async (req, res) => {
      const finding =
        await submitConsolidatedFinding(
          req.params.id,
          req.user,
          req.body
        );

      res.json(
        new ApiResponse(
          200,
          "Consolidated finding submitted to Coordinator successfully",
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
          req.user,
          req.query.scope === "review" ? "review" : "mine"
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


export const editLeadFindingCopy = asyncHandler(async (req, res) => {
  const { saveLeadEditableCopy } = await import("../services/auditFindingService.js");
  const finding = await saveLeadEditableCopy(req.params.id, req.body, req.user);
  res.json(new ApiResponse(200, "Lead review copy saved", finding));
});

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
          "Lead Auditor decision recorded",
          finding
        )
      );
    }
  );



/*
 * Audit Coordinator generates the official IQR from a finding
 * already submitted by the Lead Auditor.
 */
export const getCoordinatorFindingSummariesController = asyncHandler(async (req,res) => {
  const { listCoordinatorFindingSummaries } = await import("../services/auditFindingService.js");
  const result = await listCoordinatorFindingSummaries(req.user);
  res.json(new ApiResponse(200,"Coordinator received finding counts",result));
});
export const getCoordinatorAuditFindingsController = asyncHandler(async (req,res) => {
  const { listCoordinatorAuditFindings } = await import("../services/auditFindingService.js");
  const result = await listCoordinatorAuditFindings(req.params.scheduledAuditId, req.user);
  res.json(new ApiResponse(200,"Coordinator IQA findings",result));
});
export const reviewCoordinatorFindingController = asyncHandler(async (req,res) => {
  const { reviewCoordinatorFinding } = await import("../services/auditFindingService.js");
  const result = await reviewCoordinatorFinding(req.params.id,req.body,req.user);
  res.json(new ApiResponse(200,"Finding verified",result));
});
export const completeCoordinatorFindingController = asyncHandler(async (req,res) => {
  const { completeCoordinatorFinding } = await import("../services/auditFindingService.js");
  const result = await completeCoordinatorFinding(req.params.id,req.user);
  res.json(new ApiResponse(200,"Finding completed",result));
});

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


export const listCoordinatorConsolidatedInboxController =
  asyncHandler(async (req, res) => {
    const findings = await listCoordinatorConsolidatedInbox(req.user);

    res.json(
      new ApiResponse(
        200,
        "Coordinator consolidated inbox fetched",
        findings
      )
    );
  });


export const editCoordinatorConsolidatedFindingController =
  asyncHandler(async (req, res) => {
    const finding = await editCoordinatorConsolidatedFinding(
      req.params.id,
      req.body,
      req.user
    );

    res.json(
      new ApiResponse(200, "Consolidated finding updated", finding)
    );
  });


export const reviewCoordinatorConsolidatedClassificationController =
  asyncHandler(async (req, res) => {
    const finding =
      await reviewCoordinatorConsolidatedClassification(
        req.params.id,
        req.body?.classification,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "Coordinator classification reviewed successfully",
        finding
      )
    );
  });

/*
 * Generate an official IQR from a submitted consolidated finding.
 * Authorization and workflow validation occur in the service.
 */
export const generateReportFromConsolidatedFindingController =
  asyncHandler(async (req, res) => {
    const report = await convertConsolidatedFindingToReport(
      req.params.id,
      req.user
    );

    res.json(
      new ApiResponse(
        200,
        "Official consolidated IQR generated successfully",
        report
      )
    );
  });

export const getLeadBatchStatusController = asyncHandler(async (req, res) => {
  const { getLeadBatchStatus } = await import("../services/auditFindingService.js");
  res.json(new ApiResponse(200, "Lead batch status", await getLeadBatchStatus(req.params.scheduledAuditId, req.user)));
});
export const submitLeadBatchController = asyncHandler(async (req, res) => {
  const { submitLeadBatchToCoordinator } = await import("../services/auditFindingService.js");
  res.json(new ApiResponse(200, "Lead batch submitted to Coordinator", await submitLeadBatchToCoordinator(req.params.scheduledAuditId, req.user, req.body || {})));
});

export const discardCoordinatorFindingController = asyncHandler(async(req,res)=>{
 const {discardCoordinatorFinding} = await import("../services/auditFindingService.js");
 const result=await discardCoordinatorFinding(req.params.id,req.user);
 res.json(new ApiResponse(200,"Finding discarded with audit history",result));
});
export const generateCoordinatorBatchReportsController = asyncHandler(async(req,res)=>{
 const {generateCoordinatorBatchReports} = await import("../services/auditFindingService.js");
 const result=await generateCoordinatorBatchReports(req.params.scheduledAuditId,req.user);
 res.json(new ApiResponse(200,"Coordinator batch processed",result));
});
