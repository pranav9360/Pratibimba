import User from "../models/User.js";
import Role from "../models/Role.js";
import Prakalpa from "../models/Prakalpa.js";
import AppError from "../utils/AppError.js";

export const getUsers = async () => {
  return await User.find()
    .select("-password")
    .sort({ createdAt: -1 });
};

export const getUserById = async (id) => {
  const user = await User.findById(id).select("-password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

export const createUser = async (data) => {

  const existingUser = await User.findOne({
    email: data.email.toLowerCase(),
  });

  if (existingUser) {
    throw new AppError("Email already exists", 409);
  }

  const role = await Role.findOne({
    name: data.role,
  });

  if (!role) {
    throw new AppError("Invalid role", 400);
  }

  if (data.role === "prakalpa_manager") {

    if (!data.prakalpa) {
      throw new AppError(
        "Prakalpa Manager must have a prakalpa",
        400
      );
    }

    const prakalpa = await Prakalpa.findOne({
      name: data.prakalpa,
    });

    if (!prakalpa) {
      throw new AppError("Invalid prakalpa", 400);
    }

  }

  // Prevent duplicate "" phone values
  if (!data.phone || data.phone.trim() === "") {
    delete data.phone;
  }

  const user = await User.create(data);

  return await User.findById(user._id)
    .select("-password");

};

export const updateUser = async (id, data) => {

  const user = await User.findById(id).select("+password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Email uniqueness
  if (
    data.email &&
    data.email !== user.email
  ) {

    const existing = await User.findOne({
      email: data.email.toLowerCase(),
    });

    if (existing) {
      throw new AppError("Email already exists", 409);
    }

  }

  // Role validation
  if (data.role) {

    const role = await Role.findOne({
      name: data.role,
    });

    if (!role) {
      throw new AppError("Invalid role", 400);
    }

  }

  // Domain validation
  if (data.role === "prakalpa_manager") {

    if (!data.prakalpa) {
      throw new AppError(
        "Prakalpa Manager must have a prakalpa",
        400
      );
    }

    const prakalpa = await Prakalpa.findOne({
      name: data.prakalpa,
    });

    if (!prakalpa) {
      throw new AppError("Invalid prakalpa", 400);
    }

  }

  // Empty phone becomes undefined
  if (
    data.phone !== undefined &&
    data.phone.trim() === ""
  ) {
    data.phone = undefined;
  }

  // IMPORTANT:
  // Don't overwrite password unless user entered one.
  if (
    !data.password ||
    data.password.trim() === ""
  ) {
    delete data.password;
  }

  Object.assign(user, data);

  await user.save();

  return await User.findById(user._id)
    .select("-password");

};

export const deleteUser = async (id) => {

  const user = await User.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.active = false;

  await user.save();

  return user;

};