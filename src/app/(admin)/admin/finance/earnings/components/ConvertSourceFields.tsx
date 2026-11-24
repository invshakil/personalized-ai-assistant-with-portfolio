import { Alert, Typography } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import NumberField from "@/components/admin/NumberField";
import { selectableAccounts, type AccountSelection } from "@/lib/accountPicker";
import type { MoneyAccountRow } from "@/types";
import { fmtCurrency } from "../../format";

interface ConvertSourceFieldsProps {
  currency: string;
  accounts: MoneyAccountRow[];
  from: AccountSelection;
  onFromChange: (sel: AccountSelection) => void;
  balance: number;
  pendingTotal: number;
  amount: string;
  onAmountChange: (v: string) => void;
  onAmountBlur: () => void;
  exceedsBalance: boolean;
  /** Share of the amount beyond the pending income on record (0 when fully covered). */
  uncoveredAmount: number;
}

/** Where the money leaves from, and how much of it. */
export default function ConvertSourceFields({
  currency,
  accounts,
  from,
  onFromChange,
  balance,
  pendingTotal,
  amount,
  onAmountChange,
  onAmountBlur,
  exceedsBalance,
  uncoveredAmount,
}: ConvertSourceFieldsProps) {
  return (
    <>
      <AccountTypeAccountSelect
        accounts={accounts}
        accountLabel={`From account (${currency})`}
        value={from}
        onChange={onFromChange}
        sx={{ mb: 2 }}
      />
      {selectableAccounts(accounts, "").length === 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No {currency} account exists — create one in Money → Accounts and deposit the foreign
          income there first.
        </Alert>
      )}
      {from.accountId && (
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Available balance: {fmtCurrency(balance, currency)} · Pending income:{" "}
          {fmtCurrency(pendingTotal, currency)}
        </Typography>
      )}

      <NumberField
        label={`Amount to convert (${currency})`}
        size="small"
        fullWidth
        value={amount}
        onChange={onAmountChange}
        onBlur={onAmountBlur}
        sx={{ mb: 1 }}
      />
      {exceedsBalance && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          That&apos;s more than this account&apos;s actual balance of{" "}
          {fmtCurrency(balance, currency)}.
        </Alert>
      )}
      {!exceedsBalance && uncoveredAmount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {fmtCurrency(uncoveredAmount, currency)} of this is beyond the pending {currency} income
          on record. It converts as a plain currency exchange and is not booked as income — if it is
          client income, add it under Earnings first.
        </Alert>
      )}
    </>
  );
}
