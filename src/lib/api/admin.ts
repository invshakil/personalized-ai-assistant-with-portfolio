// Typed client for misc admin endpoints (account + portfolio site settings + theme + overview + backups).
import { apiGet, apiPut, apiPost, apiDelete } from "./client";
import type {
  FormDefaultRow,
  FormDefaultInput,
  AdminThemeSettings,
  AdminOverview,
  AdminBackupState,
  AdminBackupRecord,
  BackupFrequency,
} from "@/types";

export const adminApi = {
  // Cross-domain dashboard snapshot (finance + property).
  getOverview: () => apiGet<AdminOverview>("/overview"),
  // Update display name OR change password (handler branches on payload).
  updateAccount: (body: unknown) => apiPut("/account", body),
  // Update the portfolio SiteSettings singleton.
  updateSiteSettings: (body: unknown) => apiPut("/settings", body),
  // Update the admin theme/appearance singleton.
  updateTheme: (body: AdminThemeSettings) => apiPut("/theme", body),
  // ── Database backups ──
  getBackupState: () => apiGet<AdminBackupState>("/backup"),
  updateBackupSettings: (body: { frequency?: BackupFrequency; retentionCount?: number }) =>
    apiPut("/backup", body),
  runBackupNow: () => apiPost<AdminBackupRecord>("/backup"),
  deleteBackup: (id: string) => apiDelete(`/backup/${id}`),
  disconnectDrive: () => apiPost("/backup/google/disconnect"),
  // ── Form defaults (dropdown starting values) ──
  listFormDefaults: () => apiGet<FormDefaultRow[]>("/form-defaults"),
  setFormDefault: (body: FormDefaultInput) => apiPut<FormDefaultRow>("/form-defaults", body),
  clearFormDefault: (scope: string, field: string) =>
    apiDelete<{ cleared: boolean }>(
      `/form-defaults?scope=${encodeURIComponent(scope)}&field=${encodeURIComponent(field)}`
    ),
  /**
   * Record what a form just saved, for fields in "lastUsed" mode.
   * Resolves to the rows the server actually wrote — fields it ignored (pinned
   * to "fixed", unregistered, or empty) are absent.
   */
  rememberFormValues: (scope: string, values: Record<string, string>) =>
    apiPost<FormDefaultRow[]>("/form-defaults/remember", { scope, values }),
};
