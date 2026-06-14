// Typed client for misc admin endpoints (account + portfolio site settings).
import { apiPut } from "./client";

export const adminApi = {
  // Update display name OR change password (handler branches on payload).
  updateAccount: (body: unknown) => apiPut("/account", body),
  // Update the portfolio SiteSettings singleton.
  updateSiteSettings: (body: unknown) => apiPut("/settings", body),
};
