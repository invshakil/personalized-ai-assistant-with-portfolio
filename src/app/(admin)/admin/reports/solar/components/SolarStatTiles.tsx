import { Box } from "@mui/material";
import { BatteryCharging, Sun, Wallet } from "lucide-react";
import type { SolarOverview } from "@/types";
import { kwh, money } from "../format";
import StatTile from "./StatTile";

interface SolarStatTilesProps {
  overview: SolarOverview;
}

/** Lifetime and current-month headline figures. Independent of the selected range. */
export default function SolarStatTiles({ overview }: SolarStatTilesProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
        gap: 2,
        mb: 3,
      }}
    >
      <StatTile
        icon={<Sun size={16} />}
        label="This month"
        value={kwh(overview.monthGenerationKwh)}
        sub={`${overview.monthSelfSufficiencyPct.toFixed(0)}% self-sufficient`}
      />
      <StatTile
        icon={<Wallet size={16} />}
        label="Lifetime savings"
        value={money(overview.lifetimeSavings, overview.currency)}
        sub={`${money(overview.monthSavings, overview.currency)} this month`}
      />
      <StatTile
        icon={<Sun size={16} />}
        label="Lifetime generation"
        value={kwh(overview.lifetimeGenerationKwh)}
      />
      <StatTile
        icon={<BatteryCharging size={16} />}
        label="Battery"
        value={overview.latestBatterySoc != null ? `${overview.latestBatterySoc.toFixed(0)}%` : "—"}
        sub="latest state of charge"
      />
    </Box>
  );
}
