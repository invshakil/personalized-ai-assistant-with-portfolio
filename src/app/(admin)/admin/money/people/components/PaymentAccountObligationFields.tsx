import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { AccountSelection } from "@/lib/accountPicker";
import { fmt } from "../../format";
import type { MoneyAccountRow, ObligationRow } from "@/types";

interface Props {
  account: AccountSelection;
  obligationId: string;
  accounts: MoneyAccountRow[];
  obligations: ObligationRow[];
  onAccountChange: (sel: AccountSelection) => void;
  onObligationChange: (obligationId: string) => void;
}

export default function PaymentAccountObligationFields({
  account,
  obligationId,
  accounts,
  obligations,
  onAccountChange,
  onObligationChange,
}: Props) {
  return (
    <>
      <AccountTypeAccountSelect
        accounts={accounts}
        value={account}
        onChange={onAccountChange}
        optional
        sx={{ flexBasis: "100%" }}
      />
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Against loan</InputLabel>
        <Select
          label="Against loan"
          value={obligationId}
          onChange={(e) => onObligationChange(e.target.value)}
        >
          <MenuItem value="">— none —</MenuItem>
          {obligations.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.type === "LOAN" ? "Loan" : "Recurring"} · {fmt(o.amount)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </>
  );
}
