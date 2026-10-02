import dotenv from "dotenv";

dotenv.config();

const buildConnectionString = () => {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("uselibpqcompat");
    return url.toString();
  }

  const url = new URL("postgresql://localhost");
  url.username = process.env.POSTGRES_USER || "";
  url.password = process.env.POSTGRES_PASSWORD || "";
  url.hostname = process.env.POSTGRES_HOST || "localhost";
  url.port = process.env.POSTGRES_PORT || "5432";
  url.pathname = `/${process.env.POSTGRES_DB || "postgres"}`;
  return url.toString();
};

const smtpPort = Number(process.env.SMTP_PORT) || 587;
const isProduction = process.env.NODE_ENV === "production";

const integerSetting = (name, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const rawValue = process.env[name];
  if (rawValue === undefined || rawValue.trim() === "") return fallback;

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
};

const bodyLimitSetting = (name, fallback) => {
  const value = (process.env[name] || fallback).trim().toLowerCase();
  const match = value.match(/^(\d+)(kb|mb)$/);
  if (!match) {
    throw new Error(`${name} must use a value between 1kb and 5mb`);
  }
  const bytes = Number(match[1]) * (match[2] === "mb" ? 1024 * 1024 : 1024);
  if (!Number.isSafeInteger(bytes) || bytes < 1024 || bytes > 5 * 1024 * 1024) {
    throw new Error(`${name} must use a value between 1kb and 5mb`);
  }
  return value;
};

const buildTrustProxy = () => {
  const value = process.env.TRUST_PROXY?.trim();
  if (!value) return false;

  const entries = value.split(",").map((entry) => entry.trim()).filter(Boolean);
  const unsafeEntries = new Set(["*", "true", "0.0.0.0/0", "::/0"]);
  if (entries.length === 0 || entries.some((entry) => unsafeEntries.has(entry.toLowerCase()))) {
    throw new Error("TRUST_PROXY must list explicit trusted proxy addresses or named subnets");
  }
  return entries.length === 1 ? entries[0] : entries;
};

const buildAllowedOrigins = () => {
  if (isProduction && !process.env.ALLOWED_ORIGINS?.trim()) {
    throw new Error("ALLOWED_ORIGINS must be configured in production");
  }

  const origins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
      ];

  if (origins.length === 0 || origins.includes("*")) {
    throw new Error("ALLOWED_ORIGINS must contain explicit HTTP or HTTPS origins");
  }

  for (const origin of origins) {
    let parsed;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error("ALLOWED_ORIGINS contains an invalid origin");
    }

    if (!["http:", "https:"].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error("ALLOWED_ORIGINS must contain origins without paths, queries, or wildcards");
    }
  }

  return origins;
};

const allowedOrigins = Object.freeze(buildAllowedOrigins());

const publicUrlSetting = (name, fallback, { requiredInProduction = false } = {}) => {
  const value = process.env[name]?.trim() || fallback;
  if (requiredInProduction && isProduction && !process.env[name]?.trim()) {
    throw new Error(`${name} must be configured in production`);
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTP or HTTPS URL`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${name} must be a valid HTTP or HTTPS URL`);
  }
  return value.replace(/\/$/, "");
};

export const config = Object.freeze({
  isProduction,
  port: Number(process.env.PORT) || 8800,
  allowedOrigins,
  database: Object.freeze({
    connectionString: buildConnectionString(),
    ssl: process.env.POSTGRES_SSL === "disable"
      ? false
      : { rejectUnauthorized: process.env.POSTGRES_SSL === "verify-full" },
  }),
  email: Object.freeze({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: smtpPort,
    secure: smtpPort === 465,
    user: process.env.SMTP_USER || "",
    password: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "",
  }),
  frontendUrl: publicUrlSetting("FRONTEND_URL", allowedOrigins[0]),
  apiPublicUrl: publicUrlSetting(
    "API_PUBLIC_URL",
    `http://localhost:${Number(process.env.PORT) || 8800}`,
    { requiredInProduction: true },
  ),
  security: Object.freeze({
    trustProxy: buildTrustProxy(),
    jsonBodyLimit: bodyLimitSetting("JSON_BODY_LIMIT", "2mb"),
    rateLimits: Object.freeze({
      api: Object.freeze({
        windowMs: integerSetting("API_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
        max: integerSetting("API_RATE_LIMIT_MAX", 600),
      }),
      login: Object.freeze({
        windowMs: integerSetting("LOGIN_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
        max: integerSetting("LOGIN_RATE_LIMIT_MAX", 10),
      }),
      register: Object.freeze({
        windowMs: integerSetting("REGISTER_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
        max: integerSetting("REGISTER_RATE_LIMIT_MAX", 5),
      }),
      interaction: Object.freeze({
        windowMs: integerSetting("INTERACTION_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
        max: integerSetting("INTERACTION_RATE_LIMIT_MAX", 120),
      }),
      comment: Object.freeze({
        windowMs: integerSetting("COMMENT_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
        max: integerSetting("COMMENT_RATE_LIMIT_MAX", 30),
      }),
      newsletter: Object.freeze({
        windowMs: integerSetting("NEWSLETTER_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
        max: integerSetting("NEWSLETTER_RATE_LIMIT_MAX", 5),
      }),
      upload: Object.freeze({
        windowMs: integerSetting("UPLOAD_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
        max: integerSetting("UPLOAD_RATE_LIMIT_MAX", 30),
      }),
    }),
  }),
});
