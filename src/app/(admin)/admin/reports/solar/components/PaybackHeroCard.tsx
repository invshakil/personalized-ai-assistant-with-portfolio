import { Box, Card, CardContent, LinearProgress, Typography } from "@mui/material";
import type { SolarReport } from "@/types";
import { money } from "../format";
import MetricBlock from "./MetricBlock";

interface PaybackHeroCardProps {
  payback: SolarReport["payback"];
  currency?: string;
}

/** How much of the system cost the savings have recovered, and when it breaks even. */
export default function PaybackHeroCard({ payback: pb, currency }: PaybackHeroCardProps) {
  const pct = Math.min(100, Math.max(0, pb.percentRecovered));
  const breakEven =
    pb.remaining <= 0
      ? "Reached"
      : pb.projectedBreakEvenDate
        ? new Date(pb.projectedBreakEvenDate).toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          })
        : "—";

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Investment payback — {money(pb.installCost, currency)} system
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
            {pb.percentRecovered.toFixed(1)}% recovered
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{ my: 1.5, height: 10, borderRadius: 5 }}
        />
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 2,
            mt: 1,
          }}
        >
          <MetricBlock label="Saved so far" value={money(pb.cumulativeSavings, currency)} />
          <MetricBlock label="Remaining" value={money(Math.max(0, pb.remaining), currency)} />
          <MetricBlock label="Avg / month" value={money(pb.avgMonthlySavings, currency)} />
          <MetricBlock label="Break-even" value={breakEven} />
        </Box>
      </CardContent>
    </Card>
  );
}
