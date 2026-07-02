import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { PaymentKind } from "../../types";
import { FILTER_RANGE_PRESETS, FILTER_RANGE_LABELS, type FilterRangePreset } from "../../format";
import { KINDS, KIND_LABEL } from "../types";

interface PaymentFilterFieldsProps {
  fyFilter: string[];
  empFilter: string[];
  typeFilter: PaymentKind[];
  clientFilter: string[];
  activePreset: FilterRangePreset | "CUSTOM";
  fySelectOptions: SelectOption[];
  empSelectOptions: SelectOption[];
  clientSelectOptions: SelectOption[];
  setParams: (patch: Record<string, string | undefined>) => void;
  onPresetChange: (preset: FilterRangePreset) => void;
}

export default function PaymentFilterFields({
  fyFilter,
  empFilter,
  typeFilter,
  clientFilter,
  activePreset,
  fySelectOptions,
  empSelectOptions,
  clientSelectOptions,
  setParams,
  onPresetChange,
}: PaymentFilterFieldsProps) {
  const typeSelectOptions: SelectOption[] = KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }));
  const periodSelectOptions: SelectOption[] = [
    ...FILTER_RANGE_PRESETS.map((p) => ({ value: p, label: FILTER_RANGE_LABELS[p] })),
    ...(activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];

  return (
    <>
      <MultiSearchableSelect
        label="Fiscal Year"
        value={fyFilter}
        options={fySelectOptions}
        onChange={(ids) => setParams({ fy: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 160 }}
      />
      <MultiSearchableSelect
        label="Employee"
        value={empFilter}
        options={empSelectOptions}
        onChange={(ids) => setParams({ employee: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 180 }}
      />
      <MultiSearchableSelect
        label="Type"
        value={typeFilter}
        options={typeSelectOptions}
        onChange={(ids) => setParams({ type: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 140 }}
      />
      <MultiSearchableSelect
        label="Client"
        value={clientFilter}
        options={clientSelectOptions}
        onChange={(ids) => setParams({ client: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 180 }}
      />
      <SearchableSelect
        label="Period"
        value={activePreset}
        options={periodSelectOptions}
        onChange={(v) => onPresetChange(v as FilterRangePreset)}
        sx={{ minWidth: 170 }}
      />
    </>
  );
}
