import { validationResult } from "express-validator";

import asyncHandler from "../middleware/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import AppError from "../utils/AppError.js";

import * as userService from "../services/userService.js";

export const getUsers = asyncHandler(async (req, res) => {

  const users = await userService.getUsers();

  res.json(
    new ApiResponse(
      200,
      "Users fetched successfully",
      users
    )
  );

});

export const getUserById = asyncHandler(async (req, res) => {

  const user = await userService.getUserById(req.params.id);

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

  const user = await userService.createUser(req.body);

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
    req.body
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

  await userService.deleteUser(req.params.id);

  res.json(
    new ApiResponse(
      200,
      "User deactivated successfully"
    )
  );

});
