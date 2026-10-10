import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "pharma_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // true ระหว่างเช็ค token ที่เคยล็อกอินไว้

  // ตอนเปิดแอปครั้งแรก เช็คว่ามี token เก่าเก็บไว้ไหม ถ้ามีลองยืนยันตัวตนใหม่
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (!savedToken) {
      setLoading(false);
      return;
    }
    api
      .me(savedToken)
      .then((me) => {
        setToken(savedToken);
        setUser(me);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const { access_token } = await api.login({ username, password });
    const me = await api.me(access_token);
    localStorage.setItem(TOKEN_KEY, access_token);
    setToken(access_token);
    setUser(me);
    return me;
  };

  const register = async ({ username, email, password, full_name }) => {
    await api.register({ username, email, password, full_name });
    // สมัครเสร็จแล้วล็อกอินให้อัตโนมัติ ไม่ต้องให้ผู้ใช้กรอกซ้ำ
    return login(username, password);
  };

  const logout = async () => {
    if (token) {
      // ยิง logout ไปขึ้นบัญชีดำที่ backend ด้วย ไม่ต้องรอผลลัพธ์ก็ได้ (เผื่อ token หมดอายุไปแล้ว)
      await api.logout(token).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const changePassword = async (current_password, new_password) => {
    return api.changePassword({ current_password, new_password }, token);
  };

  const refreshUser = async () => {
    if (!token) return;
    const me = await api.me(token);
    setUser(me);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        changePassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องถูกใช้ภายใน <AuthProvider>");
  return ctx;
}
