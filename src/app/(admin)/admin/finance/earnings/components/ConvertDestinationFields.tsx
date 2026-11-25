import { TextField } from "@mui/material";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import NumberField from "@/components/admin/NumberField";
import type { AccountSelection } from "@/lib/accountPicker";
import type { MoneyAccountRow } from "@/types";
import { currencySymbol } from "../../format";

interface ConvertDestinationFieldsProps {
  /** Every account in a different currency than the source — BDT or foreign. */
  accounts: MoneyAccountRow[];
  to: AccountSelection;
  onToChange: (sel: AccountSelection) => void;
  /** "" until a destination account is chosen. */
  toCurrency: string;
  date: string;
  onDateChange: (v: string) => void;
  toAmount: string;
  onToAmountChange: (v: string) => void;
  rateLoading: boolean;
}

/** Where the money lands, when, and how much actually arrived. */
export default function ConvertDestinationFields({
  accounts,
  to,
  onToChange,
  toCurrency,
  date,
  onDateChange,
  toAmount,
  onToAmountChange,
  rateLoading,
}: ConvertDestinationFieldsProps) {
  return (
    <>
      <AccountTypeAccountSelect
        accounts={accounts}
        accountLabel={to.accountId ? `To account (${toCurrency})` : "To account"}
        value={to}
        onChange={onToChange}
        sx={{ mb: 2, mt: 2 }}
      />
      <TextField
        label="Conversion date"
        type="date"
        size="small"
        fullWidth
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        sx={{ mb: 2 }}
      />
      <NumberField
        label={
          toCurrency ? `${toCurrency} received (${currencySymbol(toCurrency)})` : "Amount received"
        }
        disabled={!toCurrency}
        size="small"
        fullWidth
        value={toAmount}
        onChange={onToAmountChange}
        helperText={
          rateLoading
            ? "Fetching live rate…"
            : toCurrency
              ? `Prefilled from the live rate — set the actual ${toCurrency} that was credited.`
              : "Pick the destination account first."
        }
        sx={{ mb: 1 }}
      />
    </>
  );
}
