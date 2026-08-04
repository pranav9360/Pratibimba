import { validationResult } from "express-validator";

import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import AppError from "../utils/AppError.js";

import * as auditPlanService from "../services/auditPlanService.js";

export const getAuditPlans = asyncHandler(async (req, res) => {

  const plans = await auditPlanService.getAuditPlans();

  res.json(
    new ApiResponse(
      200,
      "Audit plans fetched successfully",
      plans
    )
  );

});

export const getAuditPlanById = asyncHandler(async (req, res) => {

  const plan = await auditPlanService.getAuditPlanById(
    req.params.id
  );

  res.json(
    new ApiResponse(
      200,
      "Audit plan fetched successfully",
      plan
    )
  );

});

export const createAuditPlan = asyncHandler(async (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const plan = await auditPlanService.createAuditPlan(
    req.body
  );

  res.status(201).json(
    new ApiResponse(
      201,
      "Audit plan created successfully",
      plan
    )
  );

});

export const updateAuditPlan = asyncHandler(async (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const plan = await auditPlanService.updateAuditPlan(
    req.params.id,
    req.body
  );

  res.json(
    new ApiResponse(
      200,
      "Audit plan updated successfully",
      plan
    )
  );

});

export const deleteAuditPlan = asyncHandler(async (req, res) => {

  await auditPlanService.deleteAuditPlan(
    req.params.id
  );

  res.json(
    new ApiResponse(
      200,
      "Audit plan deleted successfully"
    )
  );

});

export const scheduleAuditPlan = asyncHandler(async (req, res) => {

  const plan = await auditPlanService.scheduleAuditPlan(
    req.params.id,
    req.body
  );

  res.json(
    new ApiResponse(
      200,
      "Audit scheduled successfully",
      plan
    )
  );

});
