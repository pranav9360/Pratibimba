import AppError from "../utils/AppError.js";

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(
        new AppError("Authentication required", 401)
      );
    }

    const isSuperAdminInheritingAdminAccess =
      req.user.role === "super_admin" &&
      allowedRoles.includes("admin");

    if (
      !allowedRoles.includes(req.user.role) &&
      !isSuperAdminInheritingAdminAccess
    ) {
      return next(
        new AppError(
          "You do not have permission to perform this action.",
          403
        )
      );
    }

    next();
  };
};

export default authorize;
