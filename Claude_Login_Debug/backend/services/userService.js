import User from "../models/User.js";
import Role from "../models/Role.js";
import Domain from "../models/Domain.js";
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
    email: data.email,
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

    if (!data.domain) {
      throw new AppError(
        "Prakalpa Manager must have a domain",
        400
      );
    }

    const domain = await Domain.findOne({
      name: data.domain,
    });

    if (!domain) {
      throw new AppError("Invalid domain", 400);
    }

  }

  const user = await User.create(data);

  return await User.findById(user._id)
    .select("-password");

};

export const updateUser = async (id, data) => {

  const user = await User.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (
    data.role === "prakalpa_manager" &&
    !data.domain
  ) {
    throw new AppError(
      "Prakalpa Manager must have a domain",
      400
    );
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