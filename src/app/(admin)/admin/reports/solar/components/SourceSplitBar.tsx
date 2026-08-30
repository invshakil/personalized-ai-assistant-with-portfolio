import { Box } from "@mui/material";

interface SourceSplitBarProps {
  solarKwh: number;
  batteryKwh: number;
  gridKwh: number;
  height?: number;
}

/** Single stacked horizontal bar — solar / battery / grid. */
export default function SourceSplitBar({
  solarKwh,
  batteryKwh,
  gridKwh,
  height = 12,
}: SourceSplitBarProps) {
  const total = Math.max(0, solarKwh + batteryKwh + gridKwh);
  if (total <= 0) {
    return (
      <Box
        sx={{
          height,
          borderRadius: height / 2,
          bgcolor: "action.hover",
        }}
      />
    );
  }
  const pct = (v: number) => (v / total) * 100;
  return (
    <Box
      sx={{
        display: "flex",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        bgcolor: "action.hover",
      }}
    >
      <Box sx={{ width: `${pct(solarKwh)}%`, bgcolor: "warning.main" }} />
      <Box sx={{ width: `${pct(batteryKwh)}%`, bgcolor: "primary.main" }} />
      <Box sx={{ width: `${pct(gridKwh)}%`, bgcolor: "info.main" }} />
    </Box>
  );
}
