import { FormControlLabel, Switch } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow } from "@/types";
import type { AddTenantForm } from "../types";
import NumberField from "@/components/admin/NumberField";
import type { AccountSelection } from "@/lib/accountPicker";

interface AddTenantAdvanceFieldsProps {
  form: AddTenantForm;
  onFormChange: (form: AddTenantForm) => void;
  accounts: MoneyAccountRow[];
  advanceAccount: AccountSelection;
  onAdvanceAccountChange: (sel: AccountSelection) => void;
}

export default function AddTenantAdvanceFields({
  form,
  onFormChange,
  accounts,
  advanceAccount,
  onAdvanceAccountChange,
}: AddTenantAdvanceFieldsProps) {
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
