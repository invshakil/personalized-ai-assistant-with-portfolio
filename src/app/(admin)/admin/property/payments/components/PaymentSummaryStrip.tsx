import { Box, Card, CardContent, Typography } from "@mui/material";
import { fmt } from "../types";

interface PaymentSummaryStripProps {
  totalExpected: number;
  totalPaid: number;
  totalCollected: number;
  totalOutstanding: number;
  overdueCount: number;
}

export default function PaymentSummaryStrip({
  totalExpected,
  totalPaid,
  totalCollected,
  totalOutstanding,
  overdueCount,
}: PaymentSummaryStripProps) {
  const stats = [
    { label: "Expected", value: fmt(totalExpected), color: "text.primary" },
    { label: "Total Paid", value: fmt(totalPaid), color: "success.main" },
    { label: "Collected", value: fmt(totalCollected), color: "success.main" },
    { label: "Outstanding", value: fmt(totalOutstanding), color: "error.main" },
    {
      label: "Unpaid Tenants",
      value: String(overdueCount),
      color: overdueCount > 0 ? "warning.main" : "text.secondary",
    },
  ];

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
      {stats.map((s) => (
        <Card key={s.label} sx={{ minWidth: 130, flex: "1 1 130px", bgcolor: "background.paper" }}>
          <CardContent sx={{ py: "10px !important", px: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {s.label}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
