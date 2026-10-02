import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_ALGORITHM = "HS256";
const DEFAULT_ACCESS_TOKEN_EXPIRATION = "1h";
const DEFAULT_BCRYPT_COST = 12;
const MINIMUM_PRODUCTION_SECRET_BYTES = 32;
const MAX_ACCESS_TOKEN_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const durationUnits = Object.freeze({
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
});

const parseDuration = (value) => {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match || Number(match[1]) <= 0) return null;
  return Number(match[1]) * durationUnits[match[2]];
};

export const jwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret?.trim()) {
    throw new Error("JWT_SECRET must be configured");
  }

  if (
    process.env.NODE_ENV === "production"
    && (
      Buffer.byteLength(secret, "utf8") < MINIMUM_PRODUCTION_SECRET_BYTES
      || secret.toLowerCase().includes("replace-with")
    )
  ) {
    throw new Error("JWT_SECRET must be a non-placeholder secret of at least 32 bytes in production");
  }

  return secret;
};

export const accessTokenExpiration = () => {
  const value = process.env.JWT_EXPIRES_IN?.trim() || DEFAULT_ACCESS_TOKEN_EXPIRATION;
  const duration = parseDuration(value);

  if (!duration || duration > MAX_ACCESS_TOKEN_LIFETIME_MS) {
    throw new Error("JWT_EXPIRES_IN must be between 1 second and 7 days (for example, 1h)");
  }

  return value;
};

export const bcryptCost = () => {
  const configured = process.env.BCRYPT_ROUNDS;
  const cost = configured === undefined ? DEFAULT_BCRYPT_COST : Number(configured);

  if (!Number.isInteger(cost) || cost < 10 || cost > 14) {
    throw new Error("BCRYPT_ROUNDS must be an integer between 10 and 14");
  }

  return cost;
};

export const assertAuthConfiguration = () => {
  jwtSecret();
  accessTokenExpiration();
  bcryptCost();
};

export const hashPassword = (password) => bcrypt.hash(password, bcryptCost());

export const comparePassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);

export const signApplicationToken = (payload, { expiresIn }) => jwt.sign(
  payload,
  jwtSecret(),
  { algorithm: JWT_ALGORITHM, expiresIn },
);

export const verifyApplicationToken = (token) => jwt.verify(
  token,
  jwtSecret(),
  { algorithms: [JWT_ALGORITHM] },
);

export const createAccessToken = (userId) => signApplicationToken(
  { id: userId },
  { expiresIn: accessTokenExpiration() },
);

export const verifyAccessToken = (token) => {
  const payload = verifyApplicationToken(token);

  if (
    !payload
    || typeof payload !== "object"
    || !Number.isInteger(payload.id)
    || payload.id <= 0
    || !Number.isInteger(payload.exp)
  ) {
    throw new jwt.JsonWebTokenError("Invalid access token payload");
  }

  return { id: payload.id };
};

export const authSecurity = Object.freeze({
  algorithm: JWT_ALGORITHM,
  maximumPasswordBytes: 72,
});
