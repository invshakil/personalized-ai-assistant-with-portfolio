import { TextField, Typography } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow } from "@/types";
import CurrencySelect from "@/components/admin/CurrencySelect";
import { fmt, currencySymbol } from "../../format";
import { type PaymentForm } from "../types";
import NumberField from "@/components/admin/NumberField";

interface PaymentDrawerAmountFieldsProps {
  form: PaymentForm;
  setForm: (updater: (f: PaymentForm) => PaymentForm) => void;
  accounts: MoneyAccountRow[];
  editing: boolean;
  rateLoading: boolean;
  rateNote: string | null;
  previewBdt: number | null;
  onCurrencyChange: (currency: string) => void;
}

export default function PaymentDrawerAmountFields({
  form,
  setForm,
  accounts,
  editing,
  rateLoading,
  rateNote,
  previewBdt,
  onCurrencyChange,
}: PaymentDrawerAmountFieldsProps) {
  return (
    <>
      <CurrencySelect value={form.currency} onChange={onCurrencyChange} sx={{ mb: 2 }} />
      <NumberField
        label={`Amount (${currencySymbol(form.currency)})`}
        size="small"
        fullWidth
        value={form.amount}
        onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
        sx={{ mb: 2 }}
      />
      {form.currency !== "BDT" && (
        <>
          <NumberField
            label={`FX rate (৳ per 1 ${form.currency})`}
            decimals={6}
            min={0}
            size="small"
            fullWidth
            value={form.fxRate}
            onChange={(v) => setForm((f) => ({ ...f, fxRate: v }))}
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
      )}
      <TextField
        label="Fiscal Year"
        size="small"
        fullWidth
        value={form.fiscalYear}
        onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
        helperText="Auto-set from the date (July–June); override if needed."
        sx={{ mb: 2 }}
      />
      {!editing && (
        <AccountTypeAccountSelect
          accounts={accounts}
          accountLabel="Pay from account (optional)"
          value={{ typeId: form.accountTypeId, accountId: form.accountId }}
          onChange={(sel) =>
            setForm((f) => ({ ...f, accountTypeId: sel.typeId, accountId: sel.accountId }))
          }
          optional
          sx={{ mb: 2 }}
        />
      )}
      <TextField
        label="Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.notes}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        sx={{ mb: 2 }}
      />
    </>
  );
}
