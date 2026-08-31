import { Box, Typography } from "@mui/material";

interface MetricBlockProps {
  label: string;
  value: string;
  /** Theme palette key, e.g. "success.main". Defaults to inherited text colour. */
  color?: string;
  /** "h6" for headline period figures, "body1" for supporting ones. */
  size?: "h6" | "body1";
}

/**
 * A caption above a bold figure — the unit the payback hero, the period totals
 * and the cost footer are all built from.
 */
export default function MetricBlock({ label, value, color, size = "body1" }: MetricBlockProps) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant={size} sx={{ fontWeight: 700, ...(color && { color }) }}>
        {value}
      </Typography>
    </Box>
  );
}
