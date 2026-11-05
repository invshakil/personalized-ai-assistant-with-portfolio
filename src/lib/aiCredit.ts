// Display rules for the prepaid AI credit position, shared by Settings → AI and
// the dashboard spend panel. Pure — no React.
import type { CreditSummary } from "@/services/ai/types";

export const formatCreditDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "expires 12 Mar 2027 (115 days)", "expires today (…)", "expired …", or null when no expiry. */
export function expiryLabel(c: CreditSummary): string | null {
  if (!c.expiresAt || c.daysToExpiry === null) return null;
  if (c.daysToExpiry < 0) return `expired ${formatCreditDay(c.expiresAt)}`;
  if (c.daysToExpiry === 0) return `expires today (${formatCreditDay(c.expiresAt)})`;
  return `expires ${formatCreditDay(c.expiresAt)} (${c.daysToExpiry} day${c.daysToExpiry === 1 ? "" : "s"})`;
}

/** Urgency: red once expired or empty, amber inside 30 days, otherwise plain. */
export function expiryColor(c: CreditSummary): "error" | "warning" | "default" {
  if (c.expired || c.remainingUsd <= 0) return "error";
  if (c.daysToExpiry !== null && c.daysToExpiry <= 30) return "warning";
  return "default";
}
