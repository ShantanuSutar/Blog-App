import crypto from "node:crypto";

import { logger } from "../utils/logger.js";

export const requestLogger = (req, res, next) => {
  const startedAt = process.hrtime.bigint();
  const requestId = crypto.randomUUID();
  let logged = false;
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const logRequest = (aborted = false) => {
    if (logged) return;
    logged = true;
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    const context = {
      requestId,
      method: req.method,
      path: req.path,
      status: aborted && !res.headersSent ? 499 : res.statusCode,
      durationMs: Number(durationMs.toFixed(1)),
      aborted,
    };

    if (context.path === "/health" || context.path.startsWith("/api/health")) {
      logger.debug("HTTP request completed", context);
    } else if (context.status >= 500) {
      logger.error("HTTP request completed", context);
    } else if (context.status === 429) {
      logger.warn("HTTP request completed", context);
    } else {
      logger.info("HTTP request completed", context);
    }
  };

  res.once("finish", () => logRequest(false));
  res.once("close", () => logRequest(!res.writableFinished));
  next();
};
