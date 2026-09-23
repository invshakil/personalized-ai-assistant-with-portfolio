import { Typography } from "@mui/material";
import { fmt } from "../../format";
import NumberField from "@/components/admin/NumberField";

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
      <NumberField
        label={`FX rate (৳ per 1 ${currency})`}
        decimals={6}
        min={0}
        size="small"
        fullWidth
        value={fxRate}
        onChange={onFxRateChange}
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
