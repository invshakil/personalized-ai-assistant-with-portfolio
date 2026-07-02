import { TextField, Typography } from "@mui/material";
import { fmt } from "../../format";

interface EarningFxRateFieldProps {
  currency: string;
  fxRate: string;
  onFxRateChange: (v: string) => void;
  rateLoading: boolean;
  rateNote: string | null;
  previewBdt: number | null;
}

export default function EarningFxRateField({
  currency,
  fxRate,
  onFxRateChange,
  rateLoading,
  rateNote,
  previewBdt,
}: EarningFxRateFieldProps) {
  if (currency === "BDT") return null;

  return (
    <>
      <TextField
        label={`FX rate (৳ per 1 ${currency})`}
        type="number"
        size="small"
        fullWidth
        value={fxRate}
        onChange={(e) => onFxRateChange(e.target.value)}
        helperText={
          rateLoading
            ? "Fetching live rate…"
            : (rateNote ?? "Editable — use your bank's actual rate.")
        }
        sx={{ mb: 1 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
        {previewBdt != null
          ? `= ${fmt(previewBdt)} (stored as BDT)`
          : "Enter amount and rate to see the BDT value."}
      </Typography>
    </>
  );
}
