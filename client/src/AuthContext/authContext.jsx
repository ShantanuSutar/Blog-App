import { createContext, useEffect, useState } from "react";
import api from "../api/axios.js";
export const AuthContext = createContext();

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(getStoredUser);

  const login = async (inputs) => {
    const res = await api.post(`/api/auth/login`, inputs);
    const token = res.data.token;
    setCurrentUser({ ...res.data.other, token });
    return res;
  };

  const logout = async () => {
    await api.post(`/api/auth/logout`);
    setCurrentUser(null);
  };

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const handleExpiredSession = () => setCurrentUser(null);
    window.addEventListener("auth:expired", handleExpiredSession);
    return () => window.removeEventListener("auth:expired", handleExpiredSession);
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
