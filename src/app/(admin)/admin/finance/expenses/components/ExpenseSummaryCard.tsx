import { Box, Card, Typography } from "@mui/material";
import { fmt } from "../../format";

interface ExpenseSummaryCardProps {
  total: number;
  count: number;
}

export default function ExpenseSummaryCard({ total, count }: ExpenseSummaryCardProps) {
  if (count === 0) return null;

  return (
    <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Total Expenses ({count})
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
          {fmt(total)}
        </Typography>
      </Box>
    </Card>
  );
}
