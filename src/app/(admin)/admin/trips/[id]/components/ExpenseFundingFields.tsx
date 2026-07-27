import { Box, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import CurrencySelect from "@/components/admin/CurrencySelect";
import type { MoneyAccountRow, TripParticipantRow } from "@/types";
import { accountOptions, currencySymbol, fmt } from "../../format";
import type { TripExpenseForm } from "../hooks/expenseForm";

interface Props {
  form: TripExpenseForm;
  active: TripParticipantRow[];
  accounts: MoneyAccountRow[];
  payerIsSelf: boolean;
  rateLoading: boolean;
  setForm: (updater: (f: TripExpenseForm) => TripExpenseForm) => void;
  onPayerChange: (id: string) => void;
  onAccountChange: (id: string) => void;
  onCurrencyChange: (cur: string) => void;
}

/** Who-paid + how-paid + amount block of the expense drawer. Self payers pick a
 *  funding account (its currency wins); a friend-paid expense picks a currency. */
export default function ExpenseFundingFields({
  form,
  active,
  accounts,
  payerIsSelf,
  rateLoading,
  setForm,
  onPayerChange,
  onAccountChange,
  onCurrencyChange,
}: Props) {
  const foreign = form.currency !== "BDT";
  const amount = Number(form.amount) || 0;
  const bdt = foreign && form.amount && form.fxRate ? amount * Number(form.fxRate) : null;
  const payerOptions = active.map((p) => ({
    value: p.id,
    label: `${p.name}${p.isSelf ? " (me)" : ""}`,
  }));

  return (
    <Box>
      <SearchableSelect
        label="Paid by"
        value={form.payerId}
        options={payerOptions}
        onChange={onPayerChange}
        sx={{ mb: 2 }}
      />
      {payerIsSelf ? (
        <SearchableSelect
          label="Paid from account"
          value={form.accountId}
          options={accountOptions(accounts)}
          onChange={onAccountChange}
          sx={{ mb: 0.5 }}
        />
      ) : (
        <CurrencySelect
          label="Currency paid in"
          value={form.currency}
          onChange={onCurrencyChange}
          sx={{ mb: 0.5 }}
        />
      )}
      <Typography variant="caption" sx={{ display: "block", mb: 2, color: "text.secondary" }}>
        {payerIsSelf
          ? "Credit-card and non-account spend are NOT posted to your money ledger."
          : "Paid by someone else — tracked in the trip only, never your money ledger."}
      </Typography>

      <TextField
        label={`Amount (${currencySymbol(form.currency)})`}
        type="number"
        size="small"
        fullWidth
        value={form.amount}
        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        sx={{ mb: 2 }}
      />
      {foreign && (
        <TextField
          label={`FX rate (৳ per 1 ${form.currency})`}
          type="number"
          size="small"
          fullWidth
          value={form.fxRate}
          onChange={(e) => setForm((f) => ({ ...f, fxRate: e.target.value }))}
          helperText={
            rateLoading
              ? "Fetching live rate…"
              : bdt != null
                ? `≈ ${fmt(bdt)} (stored as BDT)`
                : "Editable"
          }
          sx={{ mb: 2 }}
        />
      )}
    </Box>
  );
}
