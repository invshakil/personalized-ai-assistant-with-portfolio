import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { fmt } from "../../format";
import type { MoneyAccountRow, ObligationRow } from "@/types";

interface Props {
  accountId: string;
  obligationId: string;
  accounts: MoneyAccountRow[];
  obligations: ObligationRow[];
  onAccountChange: (accountId: string) => void;
  onObligationChange: (obligationId: string) => void;
}

export default function PaymentAccountObligationFields({
  accountId,
  obligationId,
  accounts,
  obligations,
  onAccountChange,
  onObligationChange,
}: Props) {
  return (
    <>
      <FormControl size="small" sx={{ minWidth: 130 }}>
        <InputLabel>Account</InputLabel>
        <Select label="Account" value={accountId} onChange={(e) => onAccountChange(e.target.value)}>
          <MenuItem value="">— none —</MenuItem>
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
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
