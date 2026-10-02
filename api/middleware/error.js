import multer from "multer";

import { config } from "../config.js";
import { ApiError } from "../errors/ApiError.js";

const postgresErrors = {
  "22P02": { statusCode: 400, message: "Invalid request value", code: "INVALID_VALUE" },
  "22001": { statusCode: 400, message: "A request value is too long", code: "VALUE_TOO_LONG" },
  "23502": { statusCode: 400, message: "A required value is missing", code: "REQUIRED_VALUE_MISSING" },
  "23503": { statusCode: 400, message: "A related resource could not be found", code: "RELATED_RESOURCE_NOT_FOUND" },
  "23505": { statusCode: 409, message: "A resource with those values already exists", code: "RESOURCE_CONFLICT" },
  "23514": { statusCode: 400, message: "The request violates a data constraint", code: "CONSTRAINT_VIOLATION" },
};

const redactSensitive = (value) => {
  if (typeof value !== "string") return value;

  return value
    .replace(/(bearer\s+)[a-z0-9._~-]+/gi, "$1[REDACTED]")
    .replace(/((?:password|token|secret|authorization)=)[^\s&]+/gi, "$1[REDACTED]")
    .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, "$1[REDACTED]@");
};

const normalizeError = (error) => {
  if (error instanceof ApiError) return error;

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return new ApiError(413, "The uploaded file is too large", "UPLOAD_TOO_LARGE");
    }
    return new ApiError(400, "Invalid image upload", "UPLOAD_INVALID");
  }

  if (postgresErrors[error?.code]) {
    const mapped = postgresErrors[error.code];
    return new ApiError(mapped.statusCode, mapped.message, mapped.code, undefined, {
      cause: error,
    });
  }

  return new ApiError(500, "Internal server error", "INTERNAL_SERVER_ERROR", undefined, {
    cause: error,
  });
};

export const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, "Route not found", "ROUTE_NOT_FOUND"));
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const apiError = normalizeError(error);
  const unexpectedError = !apiError.isOperational || apiError.statusCode >= 500;

  if (unexpectedError) {
    const sourceError = apiError.cause || error;
    console.error("Unhandled API error", {
      method: req.method,
      path: req.originalUrl,
      name: sourceError?.name,
      message: redactSensitive(sourceError?.message),
      stack: redactSensitive(sourceError?.stack),
    });
  }

  const body = {
    success: false,
    message: apiError.message,
    code: apiError.code,
    // Compatibility alias for components that previously consumed `error`.
    error: apiError.message,
  };

  if (apiError.details !== undefined) {
    body.details = apiError.details;
  }

  if (!config.isProduction && apiError.statusCode >= 500 && !error?.code) {
    body.debug = {
      name: (apiError.cause || error)?.name || "Error",
    };
  }

  return res.status(apiError.statusCode).json(body);
};
