import { Box, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { AccountSelection } from "@/lib/accountPicker";
import CurrencySelect from "@/components/admin/CurrencySelect";
import type { MoneyAccountRow, TripParticipantRow } from "@/types";
import { currencySymbol, fmt } from "../../format";
import type { TripExpenseForm } from "../hooks/expenseForm";
import NumberField from "@/components/admin/NumberField";

interface Props {
  form: TripExpenseForm;
  active: TripParticipantRow[];
  accounts: MoneyAccountRow[];
  payerIsSelf: boolean;
  rateLoading: boolean;
  setForm: (updater: (f: TripExpenseForm) => TripExpenseForm) => void;
  onPayerChange: (id: string) => void;
  onAccountChange: (sel: AccountSelection) => void;
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
        <AccountTypeAccountSelect
          accounts={accounts}
          accountLabel="Paid from account"
          value={{ typeId: form.accountTypeId, accountId: form.accountId }}
          onChange={onAccountChange}
          optional
          noneLabel="— none / not from an account —"
          optionLabel={(a) => `${a.name} · ${a.currency}`}
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

      <NumberField
        label={`Amount (${currencySymbol(form.currency)})`}
        size="small"
        fullWidth
        value={form.amount}
        onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
        sx={{ mb: 2 }}
      />
      {foreign && (
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
