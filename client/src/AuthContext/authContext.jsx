import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
export const AuthContext = createContext();

const persistUser = (user) => {
  try {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  } catch {
    // Keep the in-memory session usable when storage is unavailable.
  }
};

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    persistUser(null);
    return null;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getStoredUser);

  const login = useCallback(async (inputs) => {
    const res = await api.post(`/api/auth/login`, inputs);
    const nextUser = { ...res.data.other, token: res.data.token };
    persistUser(nextUser);
    setCurrentUser(nextUser);
    return res;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post(`/api/auth/logout`);
    } finally {
      setCurrentUser(null);
      persistUser(null);
    }
  }, []);

  const updateCurrentUser = useCallback((updates) => {
    setCurrentUser((user) => user ? { ...user, ...updates } : user);
  }, []);

  useEffect(() => {
    persistUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const handleExpiredSession = () => setCurrentUser(null);
    window.addEventListener("auth:expired", handleExpiredSession);
    return () => window.removeEventListener("auth:expired", handleExpiredSession);
  }, []);

  const value = useMemo(() => ({ currentUser, login, logout, updateCurrentUser }), [currentUser, login, logout, updateCurrentUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
