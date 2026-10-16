// Reuse the existing timestamp; monotonically advance even for same-ms changes.
export const markPasswordChanged = (user) => {
  user.passwordChangedAt = new Date(Math.max(
    Date.now(), (user.passwordChangedAt?.getTime() ?? 0) + 1
  ));
};

export const isPasswordSessionCurrent = (user, claims = {}) => {
  const changedAt = user.passwordChangedAt?.getTime() ?? 0;
  if (Object.hasOwn(claims, "passwordVersion")) {
    return claims.passwordVersion === changedAt;
  }
  // Legacy tokens remain valid for unchanged accounts. Reject ambiguous tokens
  // from the same second as a change; new logins carry the exact timestamp.
  return !changedAt || (Number.isFinite(claims.iat) &&
    claims.iat > Math.floor(changedAt / 1000));
};
