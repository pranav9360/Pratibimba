import AppError from "../utils/AppError.js";
import ApiResponse from "../utils/ApiResponse.js";

const errorHandler = (err, req, res, next) => {
  // Never serialize driver errors, request bodies, tokens, or validation values.

  const authError = ["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name);
  const duplicate = err.code === 11000;
  const invalid = err.name === "ValidationError" || err.name === "CastError" || (err.type === "entity.parse.failed");
  const statusCode = authError ? 401 : duplicate ? 409 : invalid ? 400 : err.statusCode || 500;
  console.error("Request failed", { statusCode });
  const message = authError ? "Your session is invalid or has expired. Please sign in again."
    : duplicate ? "A record with these unique details already exists. Review the existing record."
    : invalid ? "Invalid request values. Check the required fields and selected records."
    : err instanceof AppError && statusCode < 500 ? err.message : "Internal Server Error";

  res
    .status(statusCode)
    .json(
      new ApiResponse(
        statusCode,
        message
      )
    );
};

export default errorHandler;
