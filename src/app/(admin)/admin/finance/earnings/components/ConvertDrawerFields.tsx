import { Alert, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import { fmtCurrency } from "../../format";

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
  fromAccountBalance: number;
  exceedsBalance: boolean;
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
  fromAccountBalance,
  exceedsBalance,
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
      {convFrom && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Available balance: {fmtCurrency(fromAccountBalance, convCurrency)}
        </Typography>
      )}
      {exceedsBalance && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Selected earnings total more than this account&apos;s actual balance — some of it may
          already be spent elsewhere. Deselect some earnings.
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
