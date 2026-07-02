import { Box, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import type { FinanceDashboardData } from "../types";
import { fmt, fmtPct } from "../format";

interface RemittanceSplitCardProps {
  remittance: FinanceDashboardData["remittance"];
}

export default function RemittanceSplitCard({ remittance }: RemittanceSplitCardProps) {
  const remTotal = remittance.rem + remittance.nonRem;
  const remPct = remTotal ? (remittance.rem / remTotal) * 100 : 0;

  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
          Remittance vs Non-Remittance
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
            Remittance
          </Typography>
          <Typography variant="body2">{fmt(remittance.rem)}</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={remPct}
          sx={{
            height: 8,
            borderRadius: 4,
            mb: 2,
            "& .MuiLinearProgress-bar": { bgcolor: "success.main" },
          }}
        />
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="body2" sx={{ color: "info.main", fontWeight: 600 }}>
            Non-Remittance
          </Typography>
          <Typography variant="body2">{fmt(remittance.nonRem)}</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={100 - remPct}
          sx={{
            height: 8,
            borderRadius: 4,
            "& .MuiLinearProgress-bar": { bgcolor: "info.main" },
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
          {fmtPct(remPct / 100)} of total income received as foreign remittance.
        </Typography>
      </CardContent>
    </Card>
  );
}
