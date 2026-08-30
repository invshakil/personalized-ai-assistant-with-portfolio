import { Box, Card, CardContent, Typography } from "@mui/material";
import type { SolarTotals } from "../types";
import { kwh, money } from "../format";
import MetricBlock from "./MetricBlock";
import PowerSourcePanel from "./PowerSourcePanel";

interface PeriodSummaryCardProps {
  totals: SolarTotals;
  monthCount: number;
  /** Share of consumption a source covered, guarded against a zero total. */
  pctOf: (v: number) => number;
  currency?: string;
}

/** Totals for the selected range, where the power came from, and what it cost. */
export default function PeriodSummaryCard({
  totals,
  monthCount,
  pctOf,
  currency,
}: PeriodSummaryCardProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
          Selected period — {monthCount} month{monthCount === 1 ? "" : "s"}
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" },
            gap: 2,
            mb: 3,
          }}
        >
          <MetricBlock
            size="h6"
            label="Generated"
            value={kwh(totals.generationKwh)}
            color="warning.main"
          />
          <MetricBlock size="h6" label="Consumed" value={kwh(totals.consumptionKwh)} />
          <MetricBlock
            size="h6"
            label="Grid imported"
            value={kwh(totals.gridImportKwh)}
            color="info.main"
          />
          <MetricBlock size="h6" label="Grid exported" value={kwh(totals.gridExportKwh)} />
          <MetricBlock
            size="h6"
            label="Saved"
            value={money(totals.savings, currency)}
            color="success.main"
          />
        </Box>

        <PowerSourcePanel totals={totals} pctOf={pctOf} />

        <Box
          sx={{
            mt: 3,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
            display: "flex",
            flexWrap: "wrap",
            gap: 3,
          }}
        >
          <MetricBlock
            label="Would have paid"
            value={money(totals.wouldHaveCost, currency)}
            color="error.main"
          />
          <MetricBlock label="Actually paid" value={money(totals.actualCost, currency)} />
          <MetricBlock
            label="CO₂ avoided"
            value={`${Math.round(totals.co2AvoidedKg).toLocaleString("en-US")} kg`}
            color="success.main"
          />
        </Box>
      </CardContent>
    </Card>
  );
}
