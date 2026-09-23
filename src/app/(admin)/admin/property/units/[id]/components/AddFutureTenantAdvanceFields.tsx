import { FormControlLabel, Switch } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow } from "@/types";
import type { AddFutureForm } from "../types";
import NumberField from "@/components/admin/NumberField";
import type { AccountSelection } from "@/lib/accountPicker";

interface AddFutureTenantAdvanceFieldsProps {
  form: AddFutureForm;
  onFormChange: (form: AddFutureForm) => void;
  accounts: MoneyAccountRow[];
  advanceAccount: AccountSelection;
  onAdvanceAccountChange: (sel: AccountSelection) => void;
}

export default function AddFutureTenantAdvanceFields({
  form,
  onFormChange,
  accounts,
  advanceAccount,
  onAdvanceAccountChange,
}: AddFutureTenantAdvanceFieldsProps) {
  return (
    <>
      <FormControlLabel
        control={
          <Switch
            checked={form.advancePaid}
            onChange={(e) => onFormChange({ ...form, advancePaid: e.target.checked })}
          />
        }
        label="Advance Paid"
      />
      {form.advancePaid && (
        <NumberField
          label="Advance Amount (৳)"
          value={form.advanceAmount}
          onChange={(v) => onFormChange({ ...form, advanceAmount: v })}
          size="small"
          fullWidth
        />
      )}
      {form.advancePaid && (
        <AccountTypeAccountSelect
          accounts={accounts}
          accountLabel="Add advance to account (optional)"
          value={advanceAccount}
          onChange={onAdvanceAccountChange}
          optional
          noneLabel="— none / don't add to an account —"
        />
      )}
    </>
  );
}
