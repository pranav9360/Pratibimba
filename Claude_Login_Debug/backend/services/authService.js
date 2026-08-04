import bcrypt from "bcryptjs";
import User from "../models/User.js";
import PasswordResetOtp from "../models/PasswordResetOtp.js";
import AppError from "../utils/AppError.js";
import { generateToken } from "../utils/jwt.js";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const login = async ({ identifier, password }) => {
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  }).select("+password");

  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.active) {
    throw new AppError("Your account has been deactivated.", 403);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  console.log("EMAIL:", identifier);
  console.log("PASSWORD ENTERED:", password);
  console.log("PASSWORD MATCH:", passwordMatches);

  if (!passwordMatches) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = generateToken(user._id);

  const userObject = user.toObject();
  delete userObject.password;

  return {
    token,
    user: userObject
  };
};

export const forgotPassword = async ({ identifier }) => {
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  await PasswordResetOtp.deleteMany({
    identifier
  });

  const otp = generateOtp();

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

  await PasswordResetOtp.create({
    identifier,
    otp,
    expiresAt
  });

  return {
    otp
  };
};

export const verifyOtp = async ({ identifier, otp }) => {
  const otpRecord =
    await PasswordResetOtp.findOne({
      identifier,
      otp
    });

  if (!otpRecord) {
    throw new AppError("Invalid OTP", 400);
  }

  if (otpRecord.expiresAt < new Date()) {
    throw new AppError("OTP has expired", 400);
  }

  otpRecord.verified = true;

  await otpRecord.save();

  return true;
};

export const resetPassword = async ({
  identifier,
  otp,
  password
}) => {
  const otpRecord =
    await PasswordResetOtp.findOne({
      identifier,
      otp,
      verified: true
    });

  if (!otpRecord) {
    throw new AppError(
      "OTP verification required",
      400
    );
  }

  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  }).select("+password");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.password = password;

  await user.save();

  await PasswordResetOtp.deleteMany({
    identifier
  });

  return true;
};