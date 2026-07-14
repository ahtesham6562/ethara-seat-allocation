import { createContext, useContext, useState } from "react";
import { api } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ethara_user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const { token, user } = await api.login(email, password);
    localStorage.setItem("ethara_token", token);
    localStorage.setItem("ethara_user", JSON.stringify(user));
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem("ethara_token");
    localStorage.removeItem("ethara_user");
    setUser(null);
  }

  const canWrite = user && (user.role === "admin" || user.role === "hr");

  return (
    <AuthCtx.Provider value={{ user, login, logout, canWrite }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
