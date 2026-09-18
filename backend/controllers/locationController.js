import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

import * as locationService from "../services/locationService.js";

export const getLocations =
  asyncHandler(async (req, res) => {
    const locations =
      await locationService.getLocations();

    res.json(
      new ApiResponse(
        200,
        "Locations fetched successfully",
        locations
      )
    );
  });

export const getLocationsByPrakalpa =
  asyncHandler(async (req, res) => {
    const locations =
      await locationService.getLocationsByPrakalpa(
        req.params.prakalpa
      );

    res.json(
      new ApiResponse(
        200,
        "Locations fetched successfully",
        locations
      )
    );
  });

export const createLocation =
  asyncHandler(async (req, res) => {
    const location =
      await locationService.createLocation(
        req.body
      );

    res.status(201).json(
      new ApiResponse(
        201,
        "Location created successfully",
        location
      )
    );
  });

export const updateLocation =
  asyncHandler(async (req, res) => {
    const location =
      await locationService.updateLocation(
        req.params.id,
        req.body
      );

    res.json(
      new ApiResponse(
        200,
        "Location updated successfully",
        location
      )
    );
  });

export const deleteLocation =
  asyncHandler(async (req, res) => {
    await locationService.deleteLocation(
      req.params.id
    );

    res.json(
      new ApiResponse(
        200,
        "Location deleted successfully"
      )
    );
  });
