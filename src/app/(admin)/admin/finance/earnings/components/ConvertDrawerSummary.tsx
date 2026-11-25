import { Box, Divider, Typography } from "@mui/material";
import { currencySymbol, fmtCurrency } from "../../format";

interface ConvertDrawerSummaryProps {
  convCurrency: string;
  toCurrency: string;
  convAmountNum: number;
  convRate: number;
  convToAmountNum: number;
}

export default function ConvertDrawerSummary({
  convCurrency,
  toCurrency,
  convAmountNum,
  convRate,
  convToAmountNum,
}: ConvertDrawerSummaryProps) {
  if (convAmountNum <= 0) return null;

  return (
    <>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Converting {fmtCurrency(convAmountNum, convCurrency || "BDT")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {toCurrency && convRate > 0 && convToAmountNum > 0
            ? `@ ${convRate.toLocaleString("en-US", { maximumFractionDigits: 4 })} ${currencySymbol(toCurrency)}/${convCurrency}`
            : ""}
        </Typography>
      </Box>
    </>
  );
}
