import jwt from "jsonwebtoken";

export const generateToken = (userId, passwordChangedAt = null) =>
  jwt.sign(
    { id: userId, passwordVersion: passwordChangedAt?.getTime() ?? 0 },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );
