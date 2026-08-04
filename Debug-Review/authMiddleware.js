import jwt from "jsonwebtoken";

import User from "../models/User.js";

import AppError from "../utils/AppError.js";

import asyncHandler from "./asyncHandler.js";

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    throw new AppError(
      "Authentication required",
      401
    );
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET
  );

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError(
      "User not found",
      401
    );
  }

  if (!user.active) {
    throw new AppError(
      "Account is inactive",
      403
    );
  }

  req.user = user;

  next();
});

export default authenticate;
