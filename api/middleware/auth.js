import jwt from "jsonwebtoken";
import { parsePositiveInteger } from "../utils/request.js";
import { ApiError } from "../errors/ApiError.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET must be configured");
  }

  return secret;
};

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice(7).trim() || null;
};

const verifyRequestToken = (req) => {
  const token = getBearerToken(req);

  if (!token) {
    return null;
  }

  return jwt.verify(token, getJwtSecret());
};

export const requireAuth = (req, res, next) => {
  try {
    const user = verifyRequestToken(req);

    if (!user) {
      return next(new ApiError(401, "Authentication is required", "AUTH_REQUIRED"));
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return next(new ApiError(401, "Session expired. Please log in again.", "AUTH_TOKEN_EXPIRED"));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new ApiError(401, "Authentication token is invalid", "AUTH_TOKEN_INVALID"));
    }

    return next(error);
  }
};

export const optionalAuth = (req, res, next) => {
  try {
    req.user = verifyRequestToken(req);
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
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

export const jwtSecret = getJwtSecret;
