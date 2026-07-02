import { Box, Typography } from "@mui/material";

interface MiniStatProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

/** A compact bordered stat tile (used to fill the financial overview footer). */
export default function MiniStat({ label, value, sub, color = "text.primary" }: MiniStatProps) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, px: 1.75, py: 1.25 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color, lineHeight: 1.3 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Box>
  );
}
