import { Box, Button } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import { FILTER_RANGE_PRESETS, FILTER_RANGE_LABELS, type FilterRangePreset } from "../../format";
import ExpenseSearchField from "./ExpenseSearchField";
import ExpenseFilterActions from "./ExpenseFilterActions";
import ExpenseDateRangeFields from "./ExpenseDateRangeFields";

interface ExpenseFiltersBarProps {
  fyFilter: string[];
  fySelectOptions: SelectOption[];
  categoryFilter: string[];
  categorySelectOptions: SelectOption[];
  activePreset: FilterRangePreset | "CUSTOM";
  from?: string;
  to?: string;
  searchInput: string;
  onSearchChange: (v: string) => void;
  hasActiveFilters: boolean;
  setParams: (patch: Record<string, string | undefined>) => void;
  onPresetChange: (preset: FilterRangePreset) => void;
  onClearFilters: () => void;
  downloadHref: string;
  downloadDisabled: boolean;
  onAdd: () => void;
}

export default function ExpenseFiltersBar({
  fyFilter,
  fySelectOptions,
  categoryFilter,
  categorySelectOptions,
  activePreset,
  from,
  to,
  searchInput,
  onSearchChange,
  hasActiveFilters,
  setParams,
  onPresetChange,
  onClearFilters,
  downloadHref,
  downloadDisabled,
  onAdd,
}: ExpenseFiltersBarProps) {
  const periodSelectOptions: SelectOption[] = [
    ...FILTER_RANGE_PRESETS.map((p) => ({ value: p, label: FILTER_RANGE_LABELS[p] })),
    ...(activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
      <MultiSearchableSelect
        label="Fiscal Year"
        value={fyFilter}
        options={fySelectOptions}
        onChange={(ids) => setParams({ fy: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 160 }}
      />
      <MultiSearchableSelect
        label="Category"
        value={categoryFilter}
        options={categorySelectOptions}
        onChange={(ids) => setParams({ category: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 180 }}
      />
      <SearchableSelect
        label="Period"
        value={activePreset}
        options={periodSelectOptions}
        onChange={(v) => onPresetChange(v as FilterRangePreset)}
        sx={{ minWidth: 170 }}
      />
      <ExpenseDateRangeFields from={from} to={to} setParams={setParams} />
      <ExpenseSearchField value={searchInput} onChange={onSearchChange} />
      {hasActiveFilters && (
        <Button size="small" color="inherit" onClick={onClearFilters}>
          Clear
        </Button>
      )}
      <ExpenseFilterActions
        downloadHref={downloadHref}
        downloadDisabled={downloadDisabled}
        onAdd={onAdd}
      />
    </Box>
  );
}
