import { Box, Typography } from "@mui/material";

interface InlineMeterProps {
  pct: number;
  color?: string;
}

/** Small inline % bar for use inside a table cell. */
export default function InlineMeter({ pct, color = "success.main" }: InlineMeterProps) {
  const v = Math.min(100, Math.max(0, pct));
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
      <Box
        sx={{
          width: 56,
          height: 6,
          borderRadius: 3,
          bgcolor: "action.hover",
          overflow: "hidden",
        }}
      >
        <Box sx={{ width: `${v}%`, height: "100%", bgcolor: color }} />
      </Box>
      <Typography variant="body2" sx={{ minWidth: 36, fontVariantNumeric: "tabular-nums" }}>
        {v.toFixed(0)}%
      </Typography>
    </Box>
  );
}
