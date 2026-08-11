"use client";

import { useState, createContext, useContext, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// 类型
// ============================================================
export type UserProfile = {
  id: number;
  username: string;
  createdAt: string;
  allowLeaderboard: boolean;
  allowPredictionView: boolean;
};

type AuthState = {
  token: string | null;
  user: UserProfile | null;
  loading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const TOKEN_KEY = "wc2026_token";
const USER_KEY = "wc2026_user";

// ============================================================
// Context
// ============================================================
const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初始化：从 localStorage 恢复
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (stored && storedUser) {
        setToken(stored);
        setUser(JSON.parse(storedUser));
      }
    } catch {
      // corrupted
    }
    setLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  const refreshProfile = useCallback(async () => {
    const t = token ?? (() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } })();
    if (!t) return;
    const res = await fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.data);
      localStorage.setItem(USER_KEY, JSON.stringify(data.data));
    } else {
      logout();
    }
  }, [token, logout]);

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
