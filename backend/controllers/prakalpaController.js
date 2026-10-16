import { validationResult } from "express-validator";
import AppError from "../utils/AppError.js";
import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import * as prakalpaService from "../services/prakalpaService.js";

export const getMyPrakalpas = asyncHandler(async (req, res) => {
  if (Object.keys(req.query).length || Object.keys(req.body || {}).length) {
    throw new AppError("My Prakalpas does not accept selection parameters.", 400);
  }
  const prakalpas = await prakalpaService.getMyPrakalpas(req.user);
  res.set("Cache-Control", "no-store");
  res.json(new ApiResponse(200, "Assigned Prakalpas fetched successfully", prakalpas));
});

export const getPrakalpas =
  asyncHandler(async (req, res) => {
    const prakalpas =
      await prakalpaService.getPrakalpas(req.user, req.query.includeInactive === "true");

    res.status(200).json(
      new ApiResponse(
        200,
        "Prakalpas fetched successfully",
        prakalpas
      )
    );
  });

export const createPrakalpa =
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);
    const prakalpa =
      await prakalpaService.createPrakalpa(
        req.body,
        req.user
      );

    res.status(201).json(
      new ApiResponse(
        201,
        "Prakalpa created successfully",
        prakalpa
      )
    );
  });

export const updatePrakalpa =
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw new AppError(errors.array()[0].msg, 400);
    const prakalpa =
      await prakalpaService.updatePrakalpa(
        req.params.id,
        req.body,
        req.user
      );

    res.status(200).json(
      new ApiResponse(
        200,
        "Prakalpa updated successfully",
        prakalpa
      )
    );
  });

export const deletePrakalpa =
  asyncHandler(async (req, res) => {
    await prakalpaService.deletePrakalpa(
      req.params.id,
      req.user
    );

    res.status(200).json(
      new ApiResponse(
        200,
        "Prakalpa deleted successfully"
      )
    );
  });
