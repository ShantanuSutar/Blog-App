export const SESSION_STORAGE_KEY = "user";

// The current API issues one-hour access tokens. Older deployed API builds did
// not include an `exp` claim, so keep those sessions bounded on the client
// instead of rejecting an otherwise successful login response.
const LEGACY_SESSION_DURATION_MS = 60 * 60 * 1000;

const decodeTokenPayload = (token) => {
  try {
    const encodedPayload = token.split(".")[1];
    if (!encodedPayload) return null;

    const normalized = encodedPayload
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
};

export const getSessionExpiration = (session) => {
  if (typeof session?.token !== "string") return null;
  const payload = decodeTokenPayload(session.token);
  if (!Number.isInteger(payload?.id) || payload.id <= 0) return null;
  if (Number(payload.id) !== Number(session?.id)) return null;

  if (Number.isInteger(payload.exp) && payload.exp > 0) {
    return payload.exp * 1000;
  }

  const fallbackExpiration = Number(session?.expiresAt);
  return Number.isFinite(fallbackExpiration) && fallbackExpiration > 0
    ? fallbackExpiration
    : null;
};

const normalizeSession = (session) => {
  if (!session || typeof session !== "object") return session;

  const payload = typeof session.token === "string"
    ? decodeTokenPayload(session.token)
    : null;
  const tokenHasExpiration = Number.isInteger(payload?.exp) && payload.exp > 0;

  if (tokenHasExpiration || Number(session.expiresAt) > 0) return session;

  return {
    ...session,
    expiresAt: Date.now() + LEGACY_SESSION_DURATION_MS,
  };
};

const isValidSession = (value) => (
  value !== null
  && typeof value === "object"
  && Number.isInteger(Number(value.id))
  && Number(value.id) > 0
  && typeof value.username === "string"
  && value.username.trim().length > 0
  && typeof value.token === "string"
  && value.token.trim().length > 0
  && getSessionExpiration(value) > Date.now()
);

const storage = () => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

const readPersistedSession = () => {
  const localStorage = storage();
  if (!localStorage) return null;

  try {
    const session = JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY));
    if (isValidSession(session)) return session;
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Storage is optional; the in-memory session remains available.
    }
  }
  return null;
};

let activeSession = readPersistedSession();

export const getSession = () => activeSession;

export const getAccessToken = () => activeSession?.token || null;

export const setSession = (session) => {
  const normalizedSession = normalizeSession(session);

  if (!isValidSession(normalizedSession)) {
    throw new Error("Cannot store an invalid authentication session");
  }

  activeSession = normalizedSession;
  try {
    storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(normalizedSession));
  } catch {
    // Keep the authenticated in-memory session usable when storage is blocked.
  }
  return normalizedSession;
};

export const clearSession = () => {
  activeSession = null;
  try {
    storage()?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // The in-memory session has still been cleared.
  }
};

export const syncSessionFromStorage = () => {
  activeSession = readPersistedSession();
  return activeSession;
};
