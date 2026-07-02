import { Box, Divider, Typography } from "@mui/material";
import { fmt, fmtCurrency } from "../../format";

interface ConvertDrawerSummaryProps {
  convTotalOriginal: number;
  convCurrency: string;
  chosenCount: number;
  convRate: number;
  convToAmountNum: number;
  convVariance: number;
}

export default function ConvertDrawerSummary({
  convTotalOriginal,
  convCurrency,
  chosenCount,
  convRate,
  convToAmountNum,
  convVariance,
}: ConvertDrawerSummaryProps) {
  return (
    <>
      <Divider sx={{ my: 1 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          Converting {fmtCurrency(convTotalOriginal, convCurrency || "BDT")}
          {chosenCount > 1 ? ` (${chosenCount} earnings)` : ""}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {convRate > 0
            ? `@ ${convRate.toLocaleString("en-US", { maximumFractionDigits: 4 })} ৳/${convCurrency}`
            : ""}
        </Typography>
      </Box>
      {convToAmountNum > 0 && (
        <Typography
          variant="caption"
          sx={{ display: "block", mb: 2, color: convVariance >= 0 ? "success.main" : "error.main" }}
        >
          FX variance vs entry estimate: {convVariance >= 0 ? "+" : "−"}
          {fmt(Math.abs(convVariance))}
        </Typography>
      )}
    </>
  );
}
