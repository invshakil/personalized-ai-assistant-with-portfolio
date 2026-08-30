import { Box, Typography } from "@mui/material";
import type { SolarTotals } from "../types";
import SourceSplitBar from "./SourceSplitBar";
import SourceLegendRow from "./SourceLegendRow";

interface PowerSourcePanelProps {
  totals: SolarTotals;
  /** Share of consumption a source covered, guarded against a zero total. */
  pctOf: (v: number) => number;
}

/** The stacked source bar and its legend — solar direct, battery, grid. */
export default function PowerSourcePanel({ totals, pctOf }: PowerSourcePanelProps) {
  return (
    <>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, display: "block", mb: 1 }}
      >
        Where your power came from
      </Typography>
      <SourceSplitBar
        solarKwh={totals.fromSolarDirectKwh}
        batteryKwh={totals.fromBatteryKwh}
        gridKwh={totals.fromGridKwh}
        height={14}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
          gap: 1.5,
          mt: 2,
        }}
      >
        <SourceLegendRow
          swatchColor="warning.main"
          label="Solar (direct)"
          kwh={totals.fromSolarDirectKwh}
          pct={pctOf(totals.fromSolarDirectKwh)}
        />
        <SourceLegendRow
          swatchColor="primary.main"
          label="From battery"
          kwh={totals.fromBatteryKwh}
          pct={pctOf(totals.fromBatteryKwh)}
        />
        <SourceLegendRow
          swatchColor="info.main"
          label="From grid"
          kwh={totals.fromGridKwh}
          pct={pctOf(totals.fromGridKwh)}
        />
      </Box>
    </>
  );
}
