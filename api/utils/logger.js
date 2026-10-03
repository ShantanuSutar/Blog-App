import { config } from "../config.js";

const levels = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 100 });
const sensitiveKey = /(?:authorization|cookie|credential|databaseurl|hash|jwt|pass|password|secret|token)/i;

const redactString = (value) => value
  .replace(/(bearer\s+)[^\s]+/gi, "$1[REDACTED]")
  .replace(/((?:password|token|secret|authorization)=)[^\s&]+/gi, "$1[REDACTED]")
  .replace(/(postgres(?:ql)?:\/\/[^:\s]+:)[^@\s]+@/gi, "$1[REDACTED]@");

const sanitize = (value, seen = new WeakSet()) => {
  if (typeof value === "string") return redactString(value);
  if (typeof value === "bigint") return value.toString();
  if (value === null || value === undefined || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message || "Unexpected error"),
      code: value.code,
      stack: value.stack ? redactString(value.stack) : undefined,
    };
  }

  if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));

  return Object.fromEntries(Object.entries(value).map(([key, item]) => [
    key,
    sensitiveKey.test(key) ? "[REDACTED]" : sanitize(item, seen),
  ]));
};

const shouldLog = (level) => levels[level] >= levels[config.logging.level];

const write = (level, message, context) => {
  if (!shouldLog(level)) return;

  const safeMessage = redactString(String(message));
  const safeContext = context === undefined ? undefined : sanitize(context);
  const timestamp = new Date().toISOString();
  const structuredContext = safeContext && typeof safeContext === "object" && !Array.isArray(safeContext)
    ? safeContext
    : safeContext === undefined ? {} : { context: safeContext };
  const output = config.isProduction
    ? JSON.stringify({ timestamp, level, message: safeMessage, ...structuredContext })
    : `[${timestamp}] ${level.toUpperCase()} ${safeMessage}`;
  const method = level === "error" ? "error" : level === "warn" ? "warn" : "log";

  if (config.isProduction || safeContext === undefined) {
    console[method](output);
  } else {
    console[method](output, safeContext);
  }
};

export const logger = Object.freeze({
  debug: (message, context) => write("debug", message, context),
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context),
});

export const sanitizeLogValue = sanitize;
