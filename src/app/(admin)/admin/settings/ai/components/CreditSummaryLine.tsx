import { Box, Chip, Typography } from "@mui/material";
import type { CreditSummary } from "@/services/ai/types";

const usd = (n: number) => `$${n.toFixed(2)}`;
const day = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** "Remaining $X (est.) · expires 12 Mar 2027 (115 days)" with an urgency chip. */
export function expiryLabel(c: CreditSummary): string | null {
  if (!c.expiresAt || c.daysToExpiry === null) return null;
  if (c.daysToExpiry < 0) return `expired ${day(c.expiresAt)}`;
  if (c.daysToExpiry === 0) return `expires today (${day(c.expiresAt)})`;
  return `expires ${day(c.expiresAt)} (${c.daysToExpiry} day${c.daysToExpiry === 1 ? "" : "s"})`;
}

export function expiryColor(c: CreditSummary): "error" | "warning" | "default" {
  if (c.expired || c.remainingUsd <= 0) return "error";
  if (c.daysToExpiry !== null && c.daysToExpiry <= 30) return "warning";
  return "default";
}

export default function CreditSummaryLine({ credit }: { credit: CreditSummary | null }) {
  if (!credit) return null;
  const label = expiryLabel(credit);
  const color = expiryColor(credit);
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2, flexWrap: "wrap" }}>
      <Typography
        variant="h6"
        sx={{ fontWeight: 700, color: color === "error" ? "error.main" : "success.main" }}
      >
        {usd(credit.remainingUsd)} left
      </Typography>
      <Typography variant="caption" color="text.secondary">
        (est.) — {usd(credit.balanceUsd)} on {day(credit.asOf)} minus {usd(credit.spentSince)}{" "}
        recorded since
      </Typography>
      {label && (
        <Chip
          label={label}
          size="small"
          color={color === "default" ? undefined : color}
          variant={color === "default" ? "outlined" : "filled"}
          sx={{ height: 22 }}
        />
      )}
    </Box>
  );
}
