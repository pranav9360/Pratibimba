import { validationResult } from "express-validator";

import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import AppError from "../utils/AppError.js";

import * as scheduledAuditService from "../services/scheduledAuditService.js";

export const getScheduledAudits =
  asyncHandler(async (req, res) => {
    const audits =
      await scheduledAuditService.getScheduledAudits(
        req.query,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "Scheduled audits fetched successfully",
        audits
      )
    );
  });

export const getScheduledAuditById =
  asyncHandler(async (req, res) => {
    const audit =
      await scheduledAuditService.getScheduledAuditById(
        req.params.id,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "Scheduled audit fetched successfully",
        audit
      )
    );
  });

export const updateScheduledAudit =
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      throw new AppError(
        errors.array()[0]?.msg ||
          "Invalid Scheduled Audit data.",
        400
      );
    }

    const audit =
      await scheduledAuditService.updateScheduledAudit(
        req.params.id,
        req.body,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "Scheduled audit updated successfully",
        audit
      )
    );
  });

export const completeScheduledAudit =
  asyncHandler(async (req, res) => {
    const audit =
      await scheduledAuditService.completeScheduledAudit(
        req.params.id,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "Scheduled audit marked as completed",
        audit
      )
    );
  });

export const deleteScheduledAudit =
  asyncHandler(async (req, res) => {
    await scheduledAuditService.deleteScheduledAudit(
      req.params.id,
      req.user
    );

    res.json(
      new ApiResponse(
        200,
        "Scheduled audit deleted successfully",
        null
      )
    );
  });

export const sendScheduledAuditEmail =
  asyncHandler(async (req, res) => {
    const audit =
      await scheduledAuditService.sendScheduledAuditEmail(
        req.params.id,
        req.body,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "Scheduled audit notification email sent successfully",
        audit
      )
    );
  });

export const markMailSent =
  asyncHandler(async (req, res) => {
    const audit =
      await scheduledAuditService.markMailSent(
        req.params.id,
        req.user
      );

    res.json(
      new ApiResponse(
        200,
        "Scheduled audit mail marked as sent",
        audit
      )
    );
  });
