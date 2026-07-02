import { Box, Chip, Typography } from "@mui/material";
import type { EarningRow } from "../../types";
import { fmt, fmtCurrency, fmtForeign } from "../../format";

interface EarningAmountCellProps {
  earning: EarningRow;
}

export default function EarningAmountCell({ earning: e }: EarningAmountCellProps) {
  if (e.currency === "BDT") {
    return <Box sx={{ color: "info.main" }}>{fmt(e.amount)}</Box>;
  }
  if (e.pendingConversion) {
    return (
      <Box>
        <Box sx={{ color: "warning.main" }}>{fmtCurrency(e.originalAmount, e.currency)}</Box>
        <Chip
          size="small"
          label="Pending"
          color="warning"
          variant="outlined"
          sx={{ height: 18, fontSize: "0.65rem", mt: 0.25 }}
        />
      </Box>
    );
  }
  return (
    <Box>
      <Box sx={{ color: "success.main" }}>{fmt(e.realizedAmount ?? e.amount)}</Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", fontWeight: 400 }}
      >
        {fmtForeign(e.currency, e.originalAmount, e.realizedRate ?? e.fxRate)}
      </Typography>
    </Box>
  );
}
