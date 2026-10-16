import { validationResult } from "express-validator";

import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import AppError from "../utils/AppError.js";

import * as userService from "../services/userService.js";

export const getUsers = asyncHandler(async (req, res) => {

  const users = await userService.getUsers(req.user);

  res.json(
    new ApiResponse(
      200,
      "Users fetched successfully",
      users
    )
  );

});

export const getAuditorDirectory = asyncHandler(async (req, res) => {
  const auditors = await userService.getAuditorDirectory();

  res.json(
    new ApiResponse(200, "Auditor directory fetched successfully", auditors)
  );
});

export const getAuditPersonDirectory = asyncHandler(async (req, res) => {
  const people = await userService.getAuditPersonDirectory(req.user);
  res.json(new ApiResponse(200, "Audit-person directory fetched successfully", people));
});

export const getUserById = asyncHandler(async (req, res) => {

  const user = await userService.getUserById(req.params.id, req.user);

  res.json(
    new ApiResponse(
      200,
      "User fetched successfully",
      user
    )
  );

});

export const createUser = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const user = await userService.createUser(req.body, req.user);

  res.status(201).json(
    new ApiResponse(
      201,
      "User created successfully",
      user
    )
  );

});

export const updateUser = asyncHandler(async (req, res) => {

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const user = await userService.updateUser(
    req.params.id,
    req.body,
    req.user
  );

  res.json(
    new ApiResponse(
      200,
      "User updated successfully",
      user
    )
  );

});

export const deleteUser = asyncHandler(async (req, res) => {

  await userService.deleteUser(req.params.id, req.user, req.body?.replacementManagerId);

  res.json(
    new ApiResponse(
      200,
      "User deactivated successfully"
    )
  );

});

export const changeUserRole = asyncHandler(async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    throw new AppError(errors.array()[0].msg, 400);
  }

  const user = await userService.changeUserRole(
    req.params.id,
    req.body.role,
    req.user
  );

  res.json(new ApiResponse(200, "User role updated successfully", user));
});
