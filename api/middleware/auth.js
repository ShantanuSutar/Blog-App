import jwt from "jsonwebtoken";

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
      return res.status(401).json("Not authenticated!");
    }

    req.user = user;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json("Session expired. Please log in again.");
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json("Token is not valid!");
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

export const jwtSecret = getJwtSecret;
