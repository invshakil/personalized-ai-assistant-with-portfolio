import { Alert, Button } from "@mui/material";
import ConvertDrawerSummary from "./ConvertDrawerSummary";

interface ConvertDrawerFooterProps {
  convCurrency: string;
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
        {convSaving ? "Converting…" : "Convert to BDT"}
      </Button>
    </>
  );
}
