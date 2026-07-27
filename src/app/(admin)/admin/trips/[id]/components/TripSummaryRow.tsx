import { Box, Card, Typography } from "@mui/material";
import type { TripReport } from "@/types";
import { fmt, fmtCurrency } from "../../format";

interface Props {
  report: TripReport;
}

function Tile({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: string;
}) {
  return (
    <Card variant="outlined" sx={{ p: 2, flex: "1 1 160px", minWidth: 160 }}>
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
        {value}
      </Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {hint}
        </Typography>
      )}
    </Card>
  );
}

export default function TripSummaryRow({ report }: Props) {
  const { personalCashFlow, wallet, totalPlannedBdt, totalActualBdt, paidByMeBdt } = report;
  const remaining = totalPlannedBdt - totalActualBdt;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
      <Tile label="Planned" value={fmt(totalPlannedBdt)} />
      <Tile
        label="Group cost"
        value={fmt(totalActualBdt)}
        hint={remaining >= 0 ? `${fmt(remaining)} under budget` : `${fmt(-remaining)} over`}
        color={remaining < 0 ? "error.main" : undefined}
      />
      <Tile label="Paid by me" value={fmt(paidByMeBdt)} hint="what I fronted" />
      <Tile
        label="Out of pocket"
        value={fmt(personalCashFlow.outOfPocketBdt)}
        hint="my cash / bank — hits leisure now"
      />
      <Tile
        label="On credit card"
        value={fmt(personalCashFlow.creditCardBdt)}
        hint="deferred — not in money ledger"
        color="warning.main"
      />
      {wallet && (
        <Tile
          label={`Wallet leftover (${wallet.currency})`}
          value={fmtCurrency(wallet.balanceLocal, wallet.currency)}
          hint={wallet.balanceBdt != null ? `≈ ${fmt(wallet.balanceBdt)}` : undefined}
        />
      )}
    </Box>
  );
}
