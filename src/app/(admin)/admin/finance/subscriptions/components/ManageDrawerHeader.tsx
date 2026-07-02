import { Alert, Box, Typography } from "@mui/material";
import type { SubscriptionDetail } from "../../types";
import { fmt, fmtMonth } from "../../format";

interface ManageDrawerHeaderProps {
  detail: SubscriptionDetail;
  manageError: string | null;
  onDismissError: () => void;
}

export default function ManageDrawerHeader({
  detail,
  manageError,
  onDismissError,
}: ManageDrawerHeaderProps) {
  return (
    <>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {detail.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {detail.categoryName} · {fmt(detail.currentMonthlyAmount)}/mo · started{" "}
        {fmtMonth(detail.startDate)}
        {detail.isActive ? " · active" : ` · ended ${fmtMonth(detail.endDate)}`}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", my: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Total spent ({detail.charges.length} months)
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
          {fmt(detail.totalSpent)}
        </Typography>
      </Box>

      {manageError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={onDismissError}>
          {manageError}
        </Alert>
      )}
    </>
  );
}
