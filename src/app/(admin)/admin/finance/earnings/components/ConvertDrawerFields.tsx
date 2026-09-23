import { Alert, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import { fmtCurrency } from "../../format";
import NumberField from "@/components/admin/NumberField";

interface ConvertDrawerFieldsProps {
  convCurrency: string;
  convAmount: string;
  onConvAmountChange: (v: string) => void;
  onConvAmountBlur: () => void;
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
  pendingTotalForCurrency: number;
  exceedsPending: boolean;
}

export default function ConvertDrawerFields({
  convCurrency,
  convAmount,
  onConvAmountChange,
  onConvAmountBlur,
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
  pendingTotalForCurrency,
  exceedsPending,
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
          Available balance: {fmtCurrency(fromAccountBalance, convCurrency)} · Pending income:{" "}
          {fmtCurrency(pendingTotalForCurrency, convCurrency)}
        </Typography>
      )}

      <NumberField
        label={`Amount to convert (${convCurrency})`}
        size="small"
        fullWidth
        value={convAmount}
        onChange={onConvAmountChange}
        onBlur={onConvAmountBlur}
        sx={{ mb: 1 }}
      />
      {exceedsBalance && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          That&apos;s more than this account&apos;s actual balance — some of it may already be spent
          elsewhere.
        </Alert>
      )}
      {!exceedsBalance && exceedsPending && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          That&apos;s more than the pending {convCurrency} income on record.
        </Alert>
      )}

      <SearchableSelect
        label="To account (BDT)"
        value={convTo}
        options={toAccountOptions.map((a) => ({ value: a.id, label: a.name }))}
        onChange={onConvToChange}
        sx={{ mb: 2, mt: 2 }}
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
      <NumberField
        label="BDT received (৳)"
        size="small"
        fullWidth
        value={convToAmount}
        onChange={onConvToAmountChange}
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
