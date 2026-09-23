import { TextField, Typography } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { AccountSelection } from "@/lib/accountPicker";
import type { MoneyAccountRow } from "@/types";
import type { ExpenseForm } from "../types";

interface ExpenseFormExtraFieldsProps {
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  editing: boolean;
  accounts: MoneyAccountRow[];
  expenseAccount: AccountSelection;
  onAccountChange: (sel: AccountSelection) => void;
}

export default function ExpenseFormExtraFields({
  form,
  onFormChange,
  editing,
  accounts,
  expenseAccount,
  onAccountChange,
}: ExpenseFormExtraFieldsProps) {
  return (
    <>
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={form.expenseDate}
        onChange={(e) => onFormChange({ ...form, expenseDate: e.target.value })}
        sx={{ mb: 2 }}
      />

      {/* The account's type is the payment mode. Paying posts to the ledger
          once, on create — so on edit the account is shown but locked. */}
      <AccountTypeAccountSelect
        accounts={accounts}
        accountLabel="Paid from account (optional)"
        value={expenseAccount}
        onChange={onAccountChange}
        optional
        noneLabel="— none / don't deduct from an account —"
        disabled={editing}
        sx={{ mb: editing ? 0.5 : 2 }}
      />
      {editing && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Set when the expense was recorded — change the ledger entry in Money if needed.
        </Typography>
      )}

      <TextField
        label="Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.notes}
        onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
        sx={{ mb: 2 }}
      />
    </>
  );
}
