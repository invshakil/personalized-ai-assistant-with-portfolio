import { TextField } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import { SUPPORTED_CURRENCIES } from "@/types";
import type { RemittanceType, SourceRow } from "../../types";
import { currencySymbol } from "../../format";
import type { EarningForm } from "../types";
import EarningFxRateField from "./EarningFxRateField";
import EarningDrawerTailFields from "./EarningDrawerTailFields";

const CURRENCY_OPTIONS = SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }));

interface EarningDrawerFieldsProps {
  editing: string | null;
  form: EarningForm;
  setForm: React.Dispatch<React.SetStateAction<EarningForm>>;
  sources: SourceRow[];
  accountSelectOptions: SelectOption[];
  rateLoading: boolean;
  rateNote: string | null;
  previewBdt: number | null;
  onDateChange: (date: string) => void;
  onCurrencyChange: (currency: string) => void;
}

export default function EarningDrawerFields({
  editing,
  form,
  setForm,
  sources,
  accountSelectOptions,
  rateLoading,
  rateNote,
  previewBdt,
  onDateChange,
  onCurrencyChange,
}: EarningDrawerFieldsProps) {
  return (
    <>
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={form.date}
        onChange={(e) => onDateChange(e.target.value)}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="Client"
        value={form.sourceId}
        options={sources.map((s) => ({ value: s.id, label: s.name }))}
        onChange={(v) => setForm((f) => ({ ...f, sourceId: v }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="Type"
        value={form.remittance}
        options={[
          { value: "REM", label: "Remittance" },
          { value: "NON_REM", label: "Non-remittance" },
        ]}
        onChange={(v) => setForm((f) => ({ ...f, remittance: v as RemittanceType }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="Currency"
        value={form.currency}
        options={CURRENCY_OPTIONS}
        onChange={onCurrencyChange}
        sx={{ mb: 2 }}
      />
      <TextField
        label={`Amount (${currencySymbol(form.currency)})`}
        type="number"
        size="small"
        fullWidth
        value={form.amount}
        onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <EarningFxRateField
        currency={form.currency}
        fxRate={form.fxRate}
        onFxRateChange={(v) => setForm((f) => ({ ...f, fxRate: v }))}
        rateLoading={rateLoading}
        rateNote={rateNote}
        previewBdt={previewBdt}
      />
      <EarningDrawerTailFields
        editing={editing}
        form={form}
        setForm={setForm}
        accountSelectOptions={accountSelectOptions}
      />
    </>
  );
}
