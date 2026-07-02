import { FormControlLabel, Switch, TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import { NO_ACCOUNT, type AddFutureForm } from "../types";

interface AddFutureTenantAdvanceFieldsProps {
  form: AddFutureForm;
  onFormChange: (form: AddFutureForm) => void;
  accounts: MoneyAccountRow[];
  advanceAccountId: string;
  onAdvanceAccountChange: (id: string) => void;
}

export default function AddFutureTenantAdvanceFields({
  form,
  onFormChange,
  accounts,
  advanceAccountId,
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
        <TextField
          label="Advance Amount (৳)"
          type="number"
          value={form.advanceAmount}
          onChange={(e) => onFormChange({ ...form, advanceAmount: e.target.value })}
          size="small"
          fullWidth
        />
      )}
      {form.advancePaid && accounts.length > 0 && (
        <SearchableSelect
          label="Add advance to wallet/account (optional)"
          value={advanceAccountId}
          options={[
            { value: NO_ACCOUNT, label: "— none / don't add to wallet —" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
          onChange={onAdvanceAccountChange}
        />
      )}
    </>
  );
}
