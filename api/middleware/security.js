import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

import { config } from "../config.js";
import { ApiError } from "../errors/ApiError.js";

const rateLimitHandler = (req, res, next) => {
  next(new ApiError(
    429,
    "Too many requests. Please wait and try again.",
    "RATE_LIMIT_EXCEEDED",
  ));
};

export const createRateLimiter = ({
  windowMs,
  max,
  identifier,
  keyGenerator,
  skipSuccessfulRequests = false,
  skip = () => false,
}) => rateLimit({
  windowMs,
  limit: max,
  identifier,
  keyGenerator,
  skipSuccessfulRequests,
  skip,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});

const authenticatedKey = (req) => (
  req.user?.id ? `user:${req.user.id}` : `ip:${ipKeyGenerator(req.ip)}`
);

export const securityHeaders = helmet({
  // This server exposes JSON and image assets rather than HTML documents. A
  // document CSP here would not protect the separately deployed React app.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: config.isProduction
    ? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
    : false,
  referrerPolicy: { policy: "no-referrer" },
});

export const corsOptions = {
  origin(origin, callback) {
    // Origin-less clients (server-to-server calls, CLI tools and health probes)
    // are not subject to browser CORS and remain supported.
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ApiError(403, "Request origin is not allowed", "CORS_ORIGIN_DENIED"));
  },
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["RateLimit", "RateLimit-Policy", "Retry-After", "X-Request-Id"],
  maxAge: 600,
};

const hasRequestBody = (req) => (
  (req.headers["content-length"] !== undefined && req.headers["content-length"] !== "0")
  || req.headers["transfer-encoding"] !== undefined
);

const isUploadPath = (path) => (
  /^\/api\/upload(?:\/|$)/.test(path)
  || /^\/api\/users\/\d+\/avatar(?:\/|$)/.test(path)
);

export const requireSupportedContentType = (req, res, next) => {
  const canHaveBody = ["POST", "PUT", "PATCH"].includes(req.method);
  if (!canHaveBody || !hasRequestBody(req) || isUploadPath(req.path)) {
    next();
    return;
  }

  if (!req.is(["application/json", "application/*+json"])) {
    next(new ApiError(
      415,
      "Request body must use application/json",
      "CONTENT_TYPE_UNSUPPORTED",
    ));
    return;
  }
  next();
};

export const apiLimiter = createRateLimiter({
  ...config.security.rateLimits.api,
  identifier: "api",
  skip: (req) => req.method === "OPTIONS" || req.path === "/health" || req.path.startsWith("/health/"),
});

export const loginLimiter = createRateLimiter({
  ...config.security.rateLimits.login,
  identifier: "login",
  skipSuccessfulRequests: true,
});

export const registerLimiter = createRateLimiter({
  ...config.security.rateLimits.register,
  identifier: "register",
});

export const interactionLimiter = createRateLimiter({
  ...config.security.rateLimits.interaction,
  identifier: "interaction",
  keyGenerator: authenticatedKey,
});

export const commentLimiter = createRateLimiter({
  ...config.security.rateLimits.comment,
  identifier: "comment",
  keyGenerator: authenticatedKey,
});

export const newsletterLimiter = createRateLimiter({
  ...config.security.rateLimits.newsletter,
  identifier: "newsletter",
});

export const uploadLimiter = createRateLimiter({
  ...config.security.rateLimits.upload,
  identifier: "upload",
  keyGenerator: authenticatedKey,
});
