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

export const createUser = async (data, currentUser = null) => {

  /*
   * Phase 4I authority boundary
   *
   * Admin:
   *   - may manage operational users
   *   - may NOT create another Admin
   *
   * Super Admin:
   *   - may create Admin accounts
   *
   * Super Admin accounts themselves are deliberately not
   * provisioned through the ordinary user-management API.
   */
  if (data.role === "super_admin") {
    throw new AppError(
      "Super Admin accounts cannot be created through User Management.",
      403
    );
  }

  if (
    data.role === "admin" &&
    currentUser?.role !== "super_admin"
  ) {
    throw new AppError(
      "Only a Super Admin can create an Admin account.",
      403
    );
  }


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

export const updateUser = async (
  id,
  data,
  currentUser = null
) => {

  const user = await User.findById(id).select("+password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  /*
   * Phase 4I privileged-account protection.
   *
   * Ordinary Admins must never mutate an Admin or
   * Super Admin account.
   */
  if (
    currentUser?.role !== "super_admin" &&
    (user.role === "admin" ||
      user.role === "super_admin")
  ) {
    throw new AppError(
      "Only a Super Admin can modify an Admin account.",
      403
    );
  }

  /*
   * Promotion to Admin is also Super-Admin-only.
   */
  if (
    data.role === "admin" &&
    currentUser?.role !== "super_admin"
  ) {
    throw new AppError(
      "Only a Super Admin can assign the Admin role.",
      403
    );
  }

  /*
   * Never allow ordinary User Management to manufacture
   * a Super Admin account.
   */
  if (data.role === "super_admin") {
    throw new AppError(
      "Super Admin role cannot be assigned through User Management.",
      403
    );
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

export const deleteUser = async (
  id,
  currentUser = null
) => {

  const user = await User.findById(id);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  /*
   * Phase 4I:
   * DELETE is a soft-deactivation operation.
   * Only Super Admin may deactivate an Admin account.
   */
  if (
    currentUser?.role !== "super_admin" &&
    (user.role === "admin" ||
      user.role === "super_admin")
  ) {
    throw new AppError(
      "Only a Super Admin can deactivate an Admin account.",
      403
    );
  }

  /*
   * Protect the Super Admin account even from accidental
   * use of the ordinary user-management endpoint.
   */
  if (user.role === "super_admin") {
    throw new AppError(
      "Super Admin cannot be deactivated through User Management.",
      403
    );
  }

  user.active = false;

  await user.save();

  return user;

};