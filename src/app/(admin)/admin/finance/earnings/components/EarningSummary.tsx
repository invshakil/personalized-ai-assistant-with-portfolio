import { Box, Card, Typography } from "@mui/material";
import { fmt, fmtCurrency } from "../../format";

interface PendingByCurrency {
  currency: string;
  original: number;
  count: number;
}

interface EarningSummaryProps {
  earningsCount: number;
  total: number;
  fyFilter: string[];
  pendingByCurrency: PendingByCurrency[];
}

export default function EarningSummary({
  earningsCount,
  total,
  fyFilter,
  pendingByCurrency,
}: EarningSummaryProps) {
  if (earningsCount === 0 && pendingByCurrency.length === 0) return null;

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
      {earningsCount > 0 && (
        <Card sx={{ bgcolor: "background.paper", display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Income
              {fyFilter.length === 1
                ? ` · ${fyFilter[0]}`
                : fyFilter.length > 1
                  ? ` · ${fyFilter.join(", ")}`
                  : ""}{" "}
              ({earningsCount})
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "info.main" }}>
              {fmt(total)}
            </Typography>
          </Box>
        </Card>
      )}
      {pendingByCurrency.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", display: "inline-flex", px: 3, py: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Pending conversion (not yet in BDT income)
            </Typography>
            <Box sx={{ display: "flex", gap: 2, alignItems: "baseline" }}>
              {pendingByCurrency.map((p) => (
                <Typography
                  key={p.currency}
                  variant="h6"
                  sx={{ fontWeight: 700, color: "warning.main" }}
                >
                  {fmtCurrency(p.original, p.currency)}
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 0.5 }}
                  >
                    ({p.count})
                  </Typography>
                </Typography>
              ))}
            </Box>
          </Box>
        </Card>
      )}
    </Box>
  );
}
