import { Box, Typography } from "@mui/material";

interface SourceLegendRowProps {
  swatchColor: string;
  label: string;
  kwh: number;
  pct: number;
}

/** One legend entry under the source-split bar: swatch, label, kWh and share. */
export default function SourceLegendRow({ swatchColor, label, kwh, pct }: SourceLegendRowProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: swatchColor }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {Math.round(kwh).toLocaleString("en-US")} kWh · {pct.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
}
