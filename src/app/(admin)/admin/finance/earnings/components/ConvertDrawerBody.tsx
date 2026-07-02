import { Alert } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import type { EarningRow } from "../../types";
import ConvertEarningList from "./ConvertEarningList";
import ConvertDrawerFields from "./ConvertDrawerFields";
import ConvertDrawerFooter from "./ConvertDrawerFooter";

interface ConvertDrawerBodyProps {
  pendingCurrencies: string[];
  convCurrency: string;
  onConvCurrencyChange: (cur: string) => void;
  convList: EarningRow[];
  convSelected: Set<string>;
  onToggleSelect: (id: string) => void;
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
  convTotalOriginal: number;
  convChosenCount: number;
  convRate: number;
  convToAmountNum: number;
  convVariance: number;
  convError: string | null;
  convSaving: boolean;
  convReady: boolean;
  onConvert: () => void;
}

export default function ConvertDrawerBody({
  pendingCurrencies,
  convCurrency,
  onConvCurrencyChange,
  convList,
  convSelected,
  onToggleSelect,
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

      <ConvertEarningList earnings={convList} selected={convSelected} onToggle={onToggleSelect} />

      <ConvertDrawerFields
        convCurrency={convCurrency}
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
      />

      <ConvertDrawerFooter convCurrency={convCurrency} {...footerProps} />
    </>
  );
}
