export class ApiError extends Error {
  constructor(statusCode, message, code = "API_ERROR", details, options = {}) {
    super(message, options);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace?.(this, ApiError);
  }
}
