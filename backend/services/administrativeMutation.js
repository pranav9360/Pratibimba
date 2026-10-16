import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { withSuperAdminMutationTransaction } from "./superAdminMutationTransaction.js";

export const assertSuperAdmin = (actor) => {
  if (actor?.active !== true || actor.role !== "super_admin") {
    throw new AppError("Only an active Superadmin can manage administrative records.", 403);
  }
};

// Account revocations and role mutations take the SAME guard before reading
// authority. A conflicting transaction must retry and authorize afresh.
export const assertManagementAdmin = actor => {
  if (actor?.active !== true || !["super_admin", "admin"].includes(actor.role)) {
    throw new AppError("Active Admin or Super Admin access required.", 403);
  }
};
const mutateWithAuthority = (actor, operation, assertAuthority) => {
  assertAuthority(actor);
  return withSuperAdminMutationTransaction(async (session) => {
    const freshActor = await User.findById(actor._id).session(session);
    assertAuthority(freshActor);
    return operation(freshActor, session);
  });
};

export const withAdministrativeMutation = (actor, operation) => mutateWithAuthority(actor, operation, assertSuperAdmin);
export const withManagementMutation = (actor, operation) => mutateWithAuthority(actor, operation, assertManagementAdmin);
