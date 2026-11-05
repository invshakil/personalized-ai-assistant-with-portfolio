import { FormControlLabel, Switch, Typography } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import NumberField from "@/components/admin/NumberField";
import type { MoneyAccountRow } from "@/types";
import type { AccountSelection } from "@/lib/accountPicker";
import type { TenantForm } from "../types";

interface TenantEditAdvanceFieldsProps {
  form: TenantForm;
  onFormChange: (form: TenantForm) => void;
  /** Change in advance vs. what was held when the drawer opened (+ received, − refunded). */
  advanceDelta: number;
  accounts: MoneyAccountRow[];
  advanceAccount: AccountSelection;
  onAdvanceAccountChange: (sel: AccountSelection) => void;
}

const taka = (n: number) => `৳${Math.abs(n).toLocaleString("en-US")}`;

export default function TenantEditAdvanceFields({
  form,
  onFormChange,
  advanceDelta,
  accounts,
  advanceAccount,
  onAdvanceAccountChange,
}: TenantEditAdvanceFieldsProps) {
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
          label="Advance Amount (৳) — total held"
          value={form.advanceAmount}
          onChange={(v) => onFormChange({ ...form, advanceAmount: v })}
          size="small"
          fullWidth
          helperText="Paid in instalments? Enter the new total — only the difference is posted."
        />
      )}
      {advanceDelta !== 0 && (
        <>
          <AccountTypeAccountSelect
            accounts={accounts}
            accountLabel={`${advanceDelta > 0 ? "Add" : "Refund"} ${taka(advanceDelta)} ${advanceDelta > 0 ? "to" : "from"} account (optional)`}
            value={advanceAccount}
            onChange={onAdvanceAccountChange}
            optional
            noneLabel="— none / don't touch an account —"
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            {advanceDelta > 0
              ? `A ${taka(advanceDelta)} "Tenant Advance" credit will be added to the chosen account.`
              : `A ${taka(advanceDelta)} "Tenant Advance Refund" debit will be taken from the chosen account.`}
          </Typography>
        </>
      )}
    </>
  );
}
