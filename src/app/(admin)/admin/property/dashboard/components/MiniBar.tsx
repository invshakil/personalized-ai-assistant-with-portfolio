import { LinearProgress } from "@mui/material";

interface MiniBarProps {
  pct: number;
  color: string;
}

/** A single mini-bar (used for the per-month yearly trend rows). */
export default function MiniBar({ pct, color }: MiniBarProps) {
  return (
    <LinearProgress
      variant="determinate"
      value={Math.max(0, Math.min(100, pct))}
      sx={{
        height: 5,
        borderRadius: 3,
        bgcolor: "action.hover",
        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
      }}
    />
  );
}
