// Reset material is intentionally memory-only: never URL, localStorage or logs.
import api from "./api";
let identifier = "";
let verifiedCode = "";
export const hasResetIdentity = () => Boolean(identifier);
export const hasVerifiedReset = () => Boolean(identifier && verifiedCode);
export async function requestReset(value: string) {
  await api.post("/auth/forgot-password", { identifier: value.trim() });
  identifier = value.trim(); verifiedCode = "";
}
export async function verifyReset(code: string) {
  if (!identifier) throw new Error("Start again from Forgot Password.");
  await api.post("/auth/verify-otp", { identifier, otp: code });
  verifiedCode = code;
}
export async function finishReset(password: string) {
  if (!hasVerifiedReset()) throw new Error("Verify your reset code first.");
  await api.post("/auth/reset-password", { identifier, otp: verifiedCode, password, confirmPassword: password });
  identifier = ""; verifiedCode = "";
}
export const resendReset = () => requestReset(identifier);
