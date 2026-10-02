import { db } from "../db.js";
import { parsePositiveInteger } from "../utils/request.js";
import { ApiError } from "../errors/ApiError.js";
import { verifyAccessToken } from "../security/auth.js";

const MAX_BEARER_TOKEN_LENGTH = 8192;

const getBearerToken = (req) => {
  const authHeader = req.headers?.authorization;

  if (authHeader === undefined) {
    return null;
  }

  if (typeof authHeader !== "string") {
    throw new ApiError(401, "Authorization header is invalid", "AUTH_HEADER_INVALID");
  }

  const parts = authHeader.trim().split(/\s+/);
  if (
    parts.length !== 2
    || parts[0].toLowerCase() !== "bearer"
    || !parts[1]
    || parts[1].length > MAX_BEARER_TOKEN_LENGTH
  ) {
    throw new ApiError(401, "Authorization header is invalid", "AUTH_HEADER_INVALID");
  }

  return parts[1];
};

const verifyRequestToken = async (req) => {
  const token = getBearerToken(req);

  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  const result = await db.query("SELECT id FROM users WHERE id = $1", [payload.id]);

  if (result.rows.length === 0) {
    throw new ApiError(401, "Authentication is no longer valid", "AUTH_USER_NOT_FOUND");
  }

  return { id: result.rows[0].id };
};

const normalizeAuthError = (error) => {
  if (error instanceof ApiError) return error;

  if (error.name === "TokenExpiredError") {
    return new ApiError(401, "Session expired. Please log in again.", "AUTH_TOKEN_EXPIRED");
  }

  if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
    return new ApiError(401, "Authentication token is invalid", "AUTH_TOKEN_INVALID");
  }

  return error;
};

export const requireAuth = async (req, res, next) => {
  try {
    const user = await verifyRequestToken(req);

    if (!user) {
      return next(new ApiError(401, "Authentication is required", "AUTH_REQUIRED"));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(normalizeAuthError(error));
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    req.user = await verifyRequestToken(req);
    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError"
      || error.name === "JsonWebTokenError"
      || error.name === "NotBeforeError"
    ) {
      req.user = null;
      return next();
    }

    return next(error);
  }
};

export const requireSelf = (req, res, next) => {
  const requestedUserId = parsePositiveInteger(req.params.id);

  if (!requestedUserId) {
    return next(new ApiError(400, "Invalid user ID", "USER_ID_INVALID"));
  }
  if (req.user.id !== requestedUserId) {
    return next(new ApiError(403, "You can only update your own profile", "PROFILE_FORBIDDEN"));
  }

  return next();
};
