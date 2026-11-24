import { Alert, Button } from "@mui/material";
import ConvertDrawerSummary from "./ConvertDrawerSummary";

interface ConvertDrawerFooterProps {
  convCurrency: string;
  toCurrency: string;
  convAmountNum: number;
  convRate: number;
  convToAmountNum: number;
  convError: string | null;
  convSaving: boolean;
  convReady: boolean;
  onConvert: () => void;
}

export default function ConvertDrawerFooter({
  convCurrency,
  toCurrency,
  convAmountNum,
  convRate,
  convToAmountNum,
  convError,
  convSaving,
  convReady,
  onConvert,
}: ConvertDrawerFooterProps) {
  return (
    <>
      <ConvertDrawerSummary
        convCurrency={convCurrency}
        toCurrency={toCurrency}
        convAmountNum={convAmountNum}
        convRate={convRate}
        convToAmountNum={convToAmountNum}
      />

      {convError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {convError}
        </Alert>
      )}
      <Button variant="contained" fullWidth onClick={onConvert} disabled={convSaving || !convReady}>
        {convSaving
          ? "Converting…"
          : toCurrency === "BDT"
            ? "Convert to BDT"
            : toCurrency
              ? `Exchange to ${toCurrency}`
              : "Convert"}
      </Button>
    </>
  );
}
