import {
  Box,
  Card,
  CardContent,
  LinearProgress,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material";
import { Info } from "lucide-react";
import { fmt } from "../format";
import type { useMoneyInsights } from "../hooks/useMoneyInsights";

interface VentureIncomeCardProps {
  insights: NonNullable<ReturnType<typeof useMoneyInsights>>;
}

export default function VentureIncomeCard({ insights }: VentureIncomeCardProps) {
  const { ventureTotal, ventureProperty, ventureBusiness, venturePct, recordedIncome } = insights;

  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Venture income
          </Typography>
          <MuiTooltip title="Take-home from Property & Financial Tracker for this period. Now blended into the Income figure above. Record it as a ledger credit when the money lands in an account to keep balances accurate.">
            <Info size={14} />
          </MuiTooltip>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main", mb: 2 }}>
          {fmt(ventureTotal)}
        </Typography>

        {ventureTotal === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No venture activity in this period.
          </Typography>
        ) : (
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Property net
              </Typography>
              <Typography variant="body2">{fmt(ventureProperty)}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={venturePct}
              sx={{
                height: 6,
                borderRadius: 3,
                mb: 2,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": { bgcolor: "info.main", borderRadius: 3 },
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Business net
              </Typography>
              <Typography variant="body2">{fmt(ventureBusiness)}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={100 - venturePct}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": { bgcolor: "primary.main", borderRadius: 3 },
              }}
            />
          </>
        )}

        {recordedIncome > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
            {fmt(recordedIncome)} already recorded as ledger income this period.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
