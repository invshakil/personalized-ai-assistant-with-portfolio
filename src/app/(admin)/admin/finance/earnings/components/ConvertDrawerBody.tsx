import { Alert } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { ConvertDrawerState } from "../hooks/useConvertDrawer";
import ConvertSourceFields from "./ConvertSourceFields";
import ConvertDestinationFields from "./ConvertDestinationFields";
import ConvertDrawerFooter from "./ConvertDrawerFooter";

interface ConvertDrawerBodyProps {
  state: ConvertDrawerState;
}

export default function ConvertDrawerBody({ state }: ConvertDrawerBodyProps) {
  if (state.currencyOptions.length === 0) {
    return (
      <Alert severity="info">
        No foreign-currency balance or pending foreign earnings to convert.
      </Alert>
    );
  }

  return (
    <>
      <SearchableSelect
        label="Currency"
        value={state.convCurrency}
        options={state.currencyOptions.map((c) => ({ value: c, label: c }))}
        onChange={state.onConvCurrencyChange}
        sx={{ mb: 2 }}
      />

      <ConvertSourceFields
        currency={state.convCurrency}
        accounts={state.fromAccountOptions}
        from={state.convFrom}
        onFromChange={state.setConvFrom}
        balance={state.fromAccountBalance}
        pendingTotal={state.pendingTotalForCurrency}
        amount={state.convAmount}
        onAmountChange={state.setConvAmount}
        onAmountBlur={state.onConvAmountBlur}
        exceedsBalance={state.exceedsBalance}
        uncoveredAmount={state.uncoveredAmount}
      />

      <ConvertDestinationFields
        accounts={state.toAccountOptions}
        to={state.convTo}
        onToChange={state.setConvTo}
        toCurrency={state.toCurrency}
        date={state.convDate}
        onDateChange={state.setConvDate}
        toAmount={state.convToAmount}
        onToAmountChange={state.setConvToAmount}
        rateLoading={state.convRateLoading}
      />

      <ConvertDrawerFooter
        convCurrency={state.convCurrency}
        toCurrency={state.toCurrency}
        convAmountNum={state.convAmountNum}
        convRate={state.convRate}
        convToAmountNum={state.convToAmountNum}
        convError={state.convError}
        convSaving={state.convSaving}
        convReady={state.convReady}
        onConvert={state.doConvert}
      />
    </>
  );
}
