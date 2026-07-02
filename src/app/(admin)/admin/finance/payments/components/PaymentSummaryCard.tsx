import { Box, Card, Typography } from "@mui/material";
import { fmt } from "../../format";

interface PaymentSummaryCardProps {
  count: number;
  total: number;
}

export default function PaymentSummaryCard({ count, total }: PaymentSummaryCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 2, display: "inline-flex", px: 3, py: 1.5 }}>
      <Box>
        <Typography variant="caption" color="text.secondary">
          Total Paid ({count})
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main" }}>
          {fmt(total)}
        </Typography>
      </Box>
    </Card>
  );
}
