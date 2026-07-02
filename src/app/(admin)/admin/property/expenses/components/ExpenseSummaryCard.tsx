import { Box, Card, Typography } from "@mui/material";
import { fmt } from "../types";

interface ExpenseSummaryCardProps {
  total: number;
  hasExpenses: boolean;
}

export default function ExpenseSummaryCard({ total, hasExpenses }: ExpenseSummaryCardProps) {
  if (!hasExpenses) return null;

  return (
    <Card
      sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5, mr: 2 }}
    >
      <Box>
        <Typography variant="caption" color="text.secondary">
          Total Expenses
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
          {fmt(total)}
        </Typography>
      </Box>
    </Card>
  );
}
