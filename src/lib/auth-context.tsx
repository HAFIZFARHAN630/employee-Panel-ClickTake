"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { User, AppView, AdminPage, EmployeePage } from "./types";
import { persistAuth, clearAuth, getStoredAuth } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  appView: AppView;
  adminPage: AdminPage;
  employeePage: EmployeePage;
  hydrating: boolean;
}

interface LoginResult {
  success: boolean;
  message?: string;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  setAppView: (view: AppView) => void;
  setAdminPage: (page: AdminPage) => void;
  setEmployeePage: (page: EmployeePage) => void;
  refreshUser: () => Promise<void>;
  navigateToResetPassword: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitialView(user: User): AppView {
  if (user.userType === "admin" || user.userType === "super_admin" || user.userType === "manager") {
    return "admin";
  }
  return "employee";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    appView: "login",
    adminPage: "dashboard",
    employeePage: "overview",
    hydrating: true,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = getStoredAuth();
    if (stored?.token && stored?.user) {
      const user = stored.user as User;
      // Verify the token is still valid by calling /api/auth/me
      fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored.token}` },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error("Token invalid");
        })
        .then((freshUser) => {
          setState({
            user: freshUser,
            token: stored.token,
            isAuthenticated: true,
            appView: getInitialView(freshUser),
            adminPage: "dashboard",
            employeePage: "overview",
            hydrating: false,
          });
          // Update localStorage with fresh user data
          persistAuth(freshUser, stored.token);
        })
        .catch(() => {
          // Token expired or invalid — clear and show login
          clearAuth();
          setState((prev) => ({ ...prev, hydrating: false }));
        });
    } else {
      queueMicrotask(() => {
        setState((prev) => ({ ...prev, hydrating: false }));
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, message: data.message || data.error || "" };
      }
      const data = await res.json();
      persistAuth(data.user, data.token);
      setState((prev) => ({
        ...prev,
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        appView: (data.user.userType === "admin" || data.user.userType === "super_admin" || data.user.userType === "manager") ? "admin" : "employee",
      }));
      return { success: true };
    } catch {
      return { success: false };
    }
  }, []);

  const logout = useCallback(async () => {
    // Auto-stop any active time timers before logout
    try {
      const stored = getStoredAuth();
      if (stored?.token) {
        await fetch(`${API_BASE}/api/time-logs/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${stored.token}` },
          body: JSON.stringify({ action: "stop_all" }),
        }).catch(() => {});
      }
    } catch { /* silent */ }

    clearAuth();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      appView: "login",
      adminPage: "dashboard",
      employeePage: "overview",
      hydrating: false,
    });
  }, []);

  const setAppView = useCallback((view: AppView) => {
    setState((prev) => ({ ...prev, appView: view }));
  }, []);

  const setAdminPage = useCallback((page: AdminPage) => {
    setState((prev) => ({ ...prev, adminPage: page }));
  }, []);

  const setEmployeePage = useCallback((page: EmployeePage) => {
    setState((prev) => ({ ...prev, employeePage: page }));
  }, []);

  const navigateToResetPassword = useCallback((token: string) => {
    localStorage.setItem("reset_token", token);
    setState((prev) => ({ ...prev, appView: "reset-password" }));
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({ ...prev, user: data }));
      }
    } catch {
      // silently fail
    }
  }, [state.token]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        setAppView,
        setAdminPage,
        setEmployeePage,
        refreshUser,
        navigateToResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}