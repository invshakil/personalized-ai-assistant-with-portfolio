import { Box, LinearProgress, Typography } from "@mui/material";

interface BarRowProps {
  label: string;
  value: string;
  pct: number; // 0–100
  color?: string;
  note?: string;
}

/** A labelled value with a proportional bar beneath it. */
export default function BarRow({ label, value, pct, color = "primary.main", note }: BarRowProps) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color }}>
          {value}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, pct))}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
        }}
      />
      {note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {note}
        </Typography>
      )}
    </Box>
  );
}
