import { Box, Typography } from "@mui/material";
import type { PaymentWithTenant } from "@/types";
import { fmt } from "../types";

interface BillBreakdownProps {
  payment: PaymentWithTenant;
}

export default function BillBreakdown({ payment: p }: BillBreakdownProps) {
  if (p.rentDue <= 0) return null;
  const serviceFees = p.services.reduce((s, sv) => s + sv.monthlyFee, 0);
  const oneOffTotal = p.oneOffCharges.reduce((s, c) => s + c.amount, 0);

  return (
    <Box sx={{ mb: 1.5, pb: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, display: "block", mb: 0.5 }}
      >
        Bill Breakdown
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography variant="caption" color="text.secondary">
          Base Rent
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 600 }}>
          {fmt(p.rentDue - serviceFees - oneOffTotal - p.carryForward)}
        </Typography>
      </Box>
      {p.services.map((sv) => (
        <Box key={sv.name} sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            {sv.name}
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {fmt(sv.monthlyFee)}
          </Typography>
        </Box>
      ))}
      {p.oneOffCharges.map((c) => (
        <Box key={c.id} sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" color="text.secondary">
            {c.label} <span style={{ opacity: 0.7 }}>(one-off)</span>
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {fmt(c.amount)}
          </Typography>
        </Box>
      ))}
      {p.carryForward > 0 && (
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography variant="caption" color="warning.main">
            Previous Balance
          </Typography>
          <Typography variant="caption" sx={{ fontWeight: 600, color: "warning.main" }}>
            {fmt(p.carryForward)}
          </Typography>
        </Box>
      )}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 0.5,
          pt: 0.5,
          borderTop: "1px dashed",
          borderColor: "divider",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          Total Due
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
          {fmt(p.rentDue)}
        </Typography>
      </Box>
    </Box>
  );
}
