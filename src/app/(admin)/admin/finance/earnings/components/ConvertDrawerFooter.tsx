import { Alert, Button } from "@mui/material";
import ConvertDrawerSummary from "./ConvertDrawerSummary";

interface ConvertDrawerFooterProps {
  convTotalOriginal: number;
  convCurrency: string;
  convChosenCount: number;
  convRate: number;
  convToAmountNum: number;
  convVariance: number;
  convError: string | null;
  convSaving: boolean;
  convReady: boolean;
  onConvert: () => void;
}

export default function ConvertDrawerFooter({
  convTotalOriginal,
  convCurrency,
  convChosenCount,
  convRate,
  convToAmountNum,
  convVariance,
  convError,
  convSaving,
  convReady,
  onConvert,
}: ConvertDrawerFooterProps) {
  return (
    <>
      <ConvertDrawerSummary
        convTotalOriginal={convTotalOriginal}
        convCurrency={convCurrency}
        chosenCount={convChosenCount}
        convRate={convRate}
        convToAmountNum={convToAmountNum}
        convVariance={convVariance}
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
