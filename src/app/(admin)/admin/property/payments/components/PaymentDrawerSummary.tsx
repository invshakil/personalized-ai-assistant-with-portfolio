import { Box, Divider, Typography } from "@mui/material";
import type { PaymentWithTenant } from "@/types";
import { MONTHS, fmt } from "../types";

interface PaymentDrawerSummaryProps {
  payment: PaymentWithTenant;
  mode: "pay" | "advance";
}

export default function PaymentDrawerSummary({ payment, mode }: PaymentDrawerSummaryProps) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {payment.tenantName} · {MONTHS[payment.month - 1]} {payment.year}
      </Typography>
      <Box sx={{ bgcolor: "action.selected", px: 2, py: 1.5, borderRadius: 1, mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Balance due
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
          {fmt(payment.balance)}
        </Typography>
        {mode === "advance" && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption" color="text.secondary">
              Available advance
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
              {fmt(payment.advanceBalance)}
            </Typography>
          </>
        )}
      </Box>
    </>
  );
}
