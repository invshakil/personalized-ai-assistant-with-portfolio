// Typed client for misc admin endpoints (account + portfolio site settings + theme + overview).
import { apiGet, apiPut } from "./client";
import type { AdminThemeSettings, AdminOverview } from "@/types";

export const adminApi = {
  // Cross-domain dashboard snapshot (finance + property).
  getOverview: () => apiGet<AdminOverview>("/overview"),
  // Update display name OR change password (handler branches on payload).
  updateAccount: (body: unknown) => apiPut("/account", body),
  // Update the portfolio SiteSettings singleton.
  updateSiteSettings: (body: unknown) => apiPut("/settings", body),
  // Update the admin theme/appearance singleton.
  updateTheme: (body: AdminThemeSettings) => apiPut("/theme", body),
};
