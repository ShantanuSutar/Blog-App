export const SESSION_STORAGE_KEY = "user";

const isValidSession = (value) => (
  value !== null
  && typeof value === "object"
  && Number.isInteger(Number(value.id))
  && Number(value.id) > 0
  && typeof value.username === "string"
  && value.username.trim().length > 0
  && typeof value.token === "string"
  && value.token.trim().length > 0
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
  if (!isValidSession(session)) {
    throw new Error("Cannot store an invalid authentication session");
  }

  activeSession = session;
  try {
    storage()?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Keep the authenticated in-memory session usable when storage is blocked.
  }
  return session;
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
