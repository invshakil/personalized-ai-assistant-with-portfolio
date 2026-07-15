import { Alert } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import ConvertDrawerFields from "./ConvertDrawerFields";
import ConvertDrawerFooter from "./ConvertDrawerFooter";

interface ConvertDrawerBodyProps {
  pendingCurrencies: string[];
  convCurrency: string;
  onConvCurrencyChange: (cur: string) => void;
  convAmount: string;
  onConvAmountChange: (v: string) => void;
  onConvAmountBlur: () => void;
  convFrom: string;
  onConvFromChange: (v: string) => void;
  convTo: string;
  onConvToChange: (v: string) => void;
  convDate: string;
  onConvDateChange: (v: string) => void;
  convToAmount: string;
  onConvToAmountChange: (v: string) => void;
  convRateLoading: boolean;
  fromAccountOptions: MoneyAccountRow[];
  toAccountOptions: MoneyAccountRow[];
  fromAccountBalance: number;
  exceedsBalance: boolean;
  pendingTotalForCurrency: number;
  exceedsPending: boolean;
  convAmountNum: number;
  convRate: number;
  convToAmountNum: number;
  convError: string | null;
  convSaving: boolean;
  convReady: boolean;
  onConvert: () => void;
}

export default function ConvertDrawerBody({
  pendingCurrencies,
  convCurrency,
  onConvCurrencyChange,
  convAmount,
  onConvAmountChange,
  onConvAmountBlur,
  convFrom,
  onConvFromChange,
  convTo,
  onConvToChange,
  convDate,
  onConvDateChange,
  convToAmount,
  onConvToAmountChange,
  convRateLoading,
  fromAccountOptions,
  toAccountOptions,
  fromAccountBalance,
  exceedsBalance,
  pendingTotalForCurrency,
  exceedsPending,
  ...footerProps
}: ConvertDrawerBodyProps) {
  if (pendingCurrencies.length === 0) {
    return <Alert severity="info">No pending foreign earnings to convert.</Alert>;
  }

  return (
    <>
      <SearchableSelect
        label="Currency"
        value={convCurrency}
        options={pendingCurrencies.map((c) => ({ value: c, label: c }))}
        onChange={onConvCurrencyChange}
        sx={{ mb: 2 }}
      />

      <ConvertDrawerFields
        convCurrency={convCurrency}
        convAmount={convAmount}
        onConvAmountChange={onConvAmountChange}
        onConvAmountBlur={onConvAmountBlur}
        convFrom={convFrom}
        onConvFromChange={onConvFromChange}
        convTo={convTo}
        onConvToChange={onConvToChange}
        convDate={convDate}
        onConvDateChange={onConvDateChange}
        convToAmount={convToAmount}
        onConvToAmountChange={onConvToAmountChange}
        convRateLoading={convRateLoading}
        fromAccountOptions={fromAccountOptions}
        toAccountOptions={toAccountOptions}
        fromAccountBalance={fromAccountBalance}
        exceedsBalance={exceedsBalance}
        pendingTotalForCurrency={pendingTotalForCurrency}
        exceedsPending={exceedsPending}
      />

      <ConvertDrawerFooter convCurrency={convCurrency} {...footerProps} />
    </>
  );
}
