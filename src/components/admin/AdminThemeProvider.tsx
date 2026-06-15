"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { createAdminTheme, DEFAULT_THEME_SETTINGS } from "@/lib/adminTheme";
import { adminApi } from "@/lib/api/admin";
import type { AdminThemeSettings } from "@/types";

interface AdminThemeContextValue {
  /** Current (optimistic) settings driving the live theme. */
  settings: AdminThemeSettings;
  /** Apply changes instantly (live preview) without persisting. */
  previewSettings: (patch: Partial<AdminThemeSettings>) => void;
  /** Persist the current settings to the database. */
  saveSettings: () => Promise<void>;
  /** Apply a patch AND persist it (used by the header quick toggle). */
  updateAndSave: (patch: Partial<AdminThemeSettings>) => Promise<void>;
  /** Reset to defaults (live preview only — call saveSettings to persist). */
  resetSettings: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue | null>(null);

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) throw new Error("useAdminTheme must be used within AdminThemeProvider");
  return ctx;
}

export default function AdminThemeProvider({
  initialSettings,
  children,
}: {
  initialSettings: AdminThemeSettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<AdminThemeSettings>(initialSettings);

  // Resolve "system" against the OS preference, kept in sync via matchMedia.
  const [systemDark, setSystemDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedMode = settings.mode === "system" ? (systemDark ? "dark" : "light") : settings.mode;

  const theme = useMemo(() => createAdminTheme(settings, resolvedMode), [settings, resolvedMode]);

  const previewSettings = (patch: Partial<AdminThemeSettings>) =>
    setSettings((prev) => ({ ...prev, ...patch }));

  const saveSettings = async () => {
    await adminApi.updateTheme(settings);
  };

  const updateAndSave = async (patch: Partial<AdminThemeSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await adminApi.updateTheme(next);
  };

  const resetSettings = () => setSettings(DEFAULT_THEME_SETTINGS);

  const value = useMemo(
    () => ({ settings, previewSettings, saveSettings, updateAndSave, resetSettings }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings]
  );

  return (
    <AdminThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AdminThemeContext.Provider>
  );
}
