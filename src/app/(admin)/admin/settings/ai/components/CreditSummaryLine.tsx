import { Box, Chip, Typography } from "@mui/material";
import type { CreditSummary } from "@/services/ai/types";
import { expiryColor, expiryLabel, formatCreditDay as day } from "@/lib/aiCredit";

const usd = (n: number) => `$${n.toFixed(2)}`;

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
