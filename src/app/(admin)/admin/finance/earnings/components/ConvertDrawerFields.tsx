import { Alert, TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";

interface ConvertDrawerFieldsProps {
  convCurrency: string;
  convFrom: string;
  onConvFromChange: (v: string) => void;
  convTo: string;
  onConvToChange: (v: string) => void;
  convDate: string;
  onConvDateChange: (v: string) => void;
  convToAmount: string;
  onConvToAmountChange: (v: string) => void;
  convRateLoading: boolean;
  fromAccountOptions: MoneyAccountRow[];
  toAccountOptions: MoneyAccountRow[];
}

export default function ConvertDrawerFields({
  convCurrency,
  convFrom,
  onConvFromChange,
  convTo,
  onConvToChange,
  convDate,
  onConvDateChange,
  convToAmount,
  onConvToAmountChange,
  convRateLoading,
  fromAccountOptions,
  toAccountOptions,
}: ConvertDrawerFieldsProps) {
  return (
    <>
      <SearchableSelect
        label={`From account (${convCurrency})`}
        value={convFrom}
        options={fromAccountOptions.map((a) => ({ value: a.id, label: a.name }))}
        onChange={onConvFromChange}
        sx={{ mb: 2 }}
      />
      {fromAccountOptions.length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No {convCurrency} account exists — create one in Money → Accounts and deposit the foreign
          income there first.
        </Alert>
      )}
      <SearchableSelect
        label="To account (BDT)"
        value={convTo}
        options={toAccountOptions.map((a) => ({ value: a.id, label: a.name }))}
        onChange={onConvToChange}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Conversion date"
        type="date"
        size="small"
        fullWidth
        value={convDate}
        onChange={(e) => onConvDateChange(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        label="BDT received (৳)"
        type="number"
        size="small"
        fullWidth
        value={convToAmount}
        onChange={(e) => onConvToAmountChange(e.target.value)}
        helperText={
          convRateLoading
            ? "Fetching live rate…"
            : "Prefilled from the live rate — set the actual BDT your bank credited."
        }
        sx={{ mb: 1 }}
      />
    </>
  );
}
