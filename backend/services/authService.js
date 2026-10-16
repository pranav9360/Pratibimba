import { isValidNewPassword, PASSWORD_POLICY_MESSAGE } from "../../shared/password-policy.mjs";
import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import User from "../models/User.js";
import PasswordResetOtp from "../models/PasswordResetOtp.js";
import AppError from "../utils/AppError.js";
import { generateToken } from "../utils/jwt.js";
import { markPasswordChanged } from "../utils/passwordSessions.js";
import { withSuperAdminMutationTransaction } from "./superAdminMutationTransaction.js";
import { recordActivity, userActivityTarget } from "./activityLogService.js";
import { sendMail } from "./emailService.js";

const generateOtp = () => {
  return randomInt(100000, 1000000).toString();
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


  if (!passwordMatches) {
    throw new AppError("Invalid credentials", 401);
  }

  const token = generateToken(user._id, user.passwordChangedAt);

  const userObject = user.toObject();
  delete userObject.password;

  return {
    token,
    user: userObject
  };
};

export const forgotPassword = async ({ identifier }, deliver = sendMail) => {
  if (typeof identifier !== "string" || !identifier.trim()) {
    throw new AppError("An account identifier is required", 400);
  }
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { phone: identifier }
    ]
  });

  // Do not reveal account availability or return a reset credential to callers.
  if (!user || user.active !== true) return {};

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

  try {
    await deliver({ to: user.email, subject: "Pratibimba password reset",
      text: `Your password-reset code is ${otp}. It expires in 10 minutes.` });
  } catch (error) {
    await PasswordResetOtp.deleteMany({ identifier, otp });
    throw error;
  }
  return {};
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
  if (typeof identifier !== "string" || typeof otp !== "string" ||
      !isValidNewPassword(password)) {
    throw new AppError(PASSWORD_POLICY_MESSAGE, 400);
  }
  return withSuperAdminMutationTransaction(async (session) => {
    const otpRecord =
      await PasswordResetOtp.findOne({
        identifier,
        otp,
        verified: true
      }).session(session);

    if (!otpRecord) {
      throw new AppError(
        "OTP verification required",
        400
      );
    }
    if (otpRecord.expiresAt <= new Date()) throw new AppError("OTP has expired", 400);

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { phone: identifier }
      ]
    }).select("+password").session(session);

    if (!user) {
      throw new AppError("User not found", 404);
    }
    if (user.active !== true) throw new AppError("Account is inactive", 403);

    user.password = password;
    markPasswordChanged(user);

    await user.save({ session });
    await recordActivity({ actor: user, target: userActivityTarget(user),
      action: "password_reset", oldValue: {}, newValue: { passwordChanged: true }, session });

    await PasswordResetOtp.deleteMany({
      identifier
    }, { session });

    return true;
  });
};
