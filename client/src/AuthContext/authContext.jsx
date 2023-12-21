import axios from "axios";
import { createContext, useEffect, useState } from "react";
const URL = import.meta.env.VITE_BASE_URL;
export const AuthContext = createContext();
export const AuthContextProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(
    JSON.parse(localStorage.getItem("user")) || null
  );

  const login = async (inputs) => {
    const res = await axios.post(`${URL}/api/auth/login`, inputs);
    const token = res.data.token;
    document.cookie = `access_token=${token}; path=/;`;
    setCurrentUser(res.data.other);
  };

  const logout = async () => {
    await axios.post(`${URL}/api/auth/logout`);
    document.cookie = "access_token=; path=/;";
    setCurrentUser(null);
  };

  useEffect(() => {
    localStorage.setItem("user", JSON.stringify(currentUser));
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
