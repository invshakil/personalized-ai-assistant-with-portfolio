import { Box } from "@mui/material";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { PaymentKind } from "../../types";
import type { FilterRangePreset } from "../../format";
import PaymentFilterFields from "./PaymentFilterFields";
import PaymentFilterDateRange from "./PaymentFilterDateRange";
import PaymentFilterActions from "./PaymentFilterActions";

interface PaymentFiltersProps {
  fyFilter: string[];
  empFilter: string[];
  typeFilter: PaymentKind[];
  clientFilter: string[];
  from?: string;
  to?: string;
  activePreset: FilterRangePreset | "CUSTOM";
  hasActiveFilters: boolean;
  fySelectOptions: SelectOption[];
  empSelectOptions: SelectOption[];
  clientSelectOptions: SelectOption[];
  setParams: (patch: Record<string, string | undefined>) => void;
  onPresetChange: (preset: FilterRangePreset) => void;
  hasPayments: boolean;
  onDownloadAll: () => void;
  onAdd: () => void;
}

export default function PaymentFilters({
  fyFilter,
  empFilter,
  typeFilter,
  clientFilter,
  from,
  to,
  activePreset,
  hasActiveFilters,
  fySelectOptions,
  empSelectOptions,
  clientSelectOptions,
  setParams,
  onPresetChange,
  hasPayments,
  onDownloadAll,
  onAdd,
}: PaymentFiltersProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
      <PaymentFilterFields
        fyFilter={fyFilter}
        empFilter={empFilter}
        typeFilter={typeFilter}
        clientFilter={clientFilter}
        activePreset={activePreset}
        fySelectOptions={fySelectOptions}
        empSelectOptions={empSelectOptions}
        clientSelectOptions={clientSelectOptions}
        setParams={setParams}
        onPresetChange={onPresetChange}
      />
      <PaymentFilterDateRange
        from={from}
        to={to}
        hasActiveFilters={hasActiveFilters}
        setParams={setParams}
      />
      <PaymentFilterActions hasPayments={hasPayments} onDownloadAll={onDownloadAll} onAdd={onAdd} />
    </Box>
  );
}
