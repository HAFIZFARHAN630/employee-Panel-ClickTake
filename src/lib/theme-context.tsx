"use client";

import React, { createContext, useContext, useCallback, useSyncExternalStore, type ReactNode } from "react";

type Theme = "dark" | "light";

// --- External store for theme (localStorage) ---
function subscribeToTheme(callback: () => void) {
  window.addEventListener("storage", callback);
  // Custom event so we can dispatch from within the same tab
  window.addEventListener("theme-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("theme-change", callback);
  };
}

function getThemeSnapshot(): Theme {
  return (localStorage.getItem("theme") as Theme) || "dark";
}

// Server always returns "dark" to match <html data-theme="dark">
function getServerThemeSnapshot(): Theme {
  return "dark";
}

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // useSyncExternalStore handles hydration correctly:
  // - Server uses getServerThemeSnapshot() → "dark"
  // - Client uses getThemeSnapshot() → reads localStorage
  // React reconciles the difference without a hydration error
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  // Keep data-theme attribute in sync
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem("theme", t);
    document.documentElement.setAttribute("data-theme", t);
    // Dispatch custom event so useSyncExternalStore re-reads
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  const toggleTheme = useCallback(() => {
    const current = (localStorage.getItem("theme") as Theme) || "dark";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
    window.dispatchEvent(new Event("theme-change"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}