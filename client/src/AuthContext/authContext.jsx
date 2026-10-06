import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import {
  clearSession,
  getSession,
  SESSION_STORAGE_KEY,
  setSession,
  syncSessionFromStorage,
} from "../auth/session.js";
export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getSession);

  const login = useCallback(async (inputs) => {
    const res = await api.post(`/api/auth/login`, inputs);
    const nextUser = { ...res.data.other, token: res.data.token };
    setSession(nextUser);
    setCurrentUser(nextUser);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post(`/api/auth/logout`);
    } finally {
      clearSession();
      setCurrentUser(null);
    }
  }, []);

  const updateCurrentUser = useCallback((updates) => {
    setCurrentUser((user) => {
      if (!user) return user;
      const nextUser = { ...user, ...updates };
      setSession(nextUser);
      return nextUser;
    });
  }, []);

  useEffect(() => {
    const handleExpiredSession = () => {
      clearSession();
      setCurrentUser(null);
    };
    const handleStorage = (event) => {
      if (event.key === SESSION_STORAGE_KEY || event.key === null) {
        setCurrentUser(syncSessionFromStorage());
      }
    };

    window.addEventListener("auth:expired", handleExpiredSession);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("auth:expired", handleExpiredSession);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const value = useMemo(() => ({ currentUser, login, logout, updateCurrentUser }), [currentUser, login, logout, updateCurrentUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
