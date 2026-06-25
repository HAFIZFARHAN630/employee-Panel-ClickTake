"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { User, AppView, AdminPage, EmployeePage } from "./types";
import { persistAuth, clearAuth } from "./api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  appView: AppView;
  adminPage: AdminPage;
  employeePage: EmployeePage;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    appView: "login",
    adminPage: "dashboard",
    employeePage: "overview",
  });

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch("/api/auth/login", {
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

  const logout = useCallback(() => {
    clearAuth();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      appView: "login",
      adminPage: "dashboard",
      employeePage: "overview",
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
      const res = await fetch("/api/auth/me", {
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