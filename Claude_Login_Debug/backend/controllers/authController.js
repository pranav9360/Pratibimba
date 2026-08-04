import { validationResult } from "express-validator";

import ApiResponse from "../utils/ApiResponse.js";
import AppError from "../utils/AppError.js";
import asyncHandler from "../middleware/asyncHandler.js";

import * as authService from "../services/authService.js";

export const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const result = await authService.login(req.body);

  res.status(200).json(
    new ApiResponse(
      200,
      "Login successful",
      result
    )
  );
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const result = await authService.forgotPassword(req.body);

  res.status(200).json(
    new ApiResponse(
      200,
      "OTP generated successfully",
      result
    )
  );
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  await authService.verifyOtp(req.body);

  res.status(200).json(
    new ApiResponse(
      200,
      "OTP verified successfully"
    )
  );
});

export const resetPassword = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  await authService.resetPassword(req.body);

  res.status(200).json(
    new ApiResponse(
      200,
      "Password reset successful"
    )
  );
});
export const me = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      "User fetched successfully",
      req.user
    )
  );
});