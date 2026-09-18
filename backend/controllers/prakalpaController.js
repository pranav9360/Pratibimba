import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import * as prakalpaService from "../services/prakalpaService.js";

export const getPrakalpas =
  asyncHandler(async (req, res) => {
    const prakalpas =
      await prakalpaService.getPrakalpas();

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
    const prakalpa =
      await prakalpaService.createPrakalpa(
        req.body
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
    const prakalpa =
      await prakalpaService.updatePrakalpa(
        req.params.id,
        req.body
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
      req.params.id
    );

    res.status(200).json(
      new ApiResponse(
        200,
        "Prakalpa deleted successfully"
      )
    );
  });
