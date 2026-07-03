import { Box } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { MoneyRange } from "../../format";
import type { DirFilter } from "../types";
import EntryDateRangeFields from "./EntryDateRangeFields";
import EntryMultiFilters from "./EntryMultiFilters";
import EntrySearchField from "./EntrySearchField";
import EntryFilterActions from "./EntryFilterActions";
import ClearFiltersButton from "./ClearFiltersButton";

interface EntryFiltersProps {
  activePreset: MoneyRange | "CUSTOM";
  periodSelectOptions: SelectOption[];
  from?: string;
  to?: string;
  dirFilter: DirFilter;
  typeSelectOptions: SelectOption[];
  categoryFilter: string[];
  categorySelectOptions: SelectOption[];
  accountFilter: string[];
  accountSelectOptions: SelectOption[];
  currencyFilter: string[];
  searchInput: string;
  hasActiveFilters: boolean;
  setParams: (patch: Record<string, string | undefined>) => void;
  onPresetChange: (preset: MoneyRange) => void;
  onTypeChange: (next: DirFilter) => void;
  onSearchInputChange: (v: string) => void;
  onClearFilters: () => void;
  onOpenTransfer: () => void;
  onOpenAdd: () => void;
}

export default function EntryFilters({
  activePreset,
  periodSelectOptions,
  from,
  to,
  dirFilter,
  typeSelectOptions,
  categoryFilter,
  categorySelectOptions,
  accountFilter,
  accountSelectOptions,
  currencyFilter,
  searchInput,
  hasActiveFilters,
  setParams,
  onPresetChange,
  onTypeChange,
  onSearchInputChange,
  onClearFilters,
  onOpenTransfer,
  onOpenAdd,
}: EntryFiltersProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
      <SearchableSelect
        label="Period"
        value={activePreset}
        options={periodSelectOptions}
        onChange={(v) => onPresetChange(v as MoneyRange)}
        sx={{ minWidth: 170 }}
      />
      <EntryDateRangeFields from={from} to={to} setParams={setParams} />
      <SearchableSelect
        label="Type"
        value={dirFilter}
        options={typeSelectOptions}
        onChange={(v) => onTypeChange(v as DirFilter)}
        sx={{ minWidth: 140 }}
      />
      <EntryMultiFilters
        dirFilter={dirFilter}
        categoryFilter={categoryFilter}
        categorySelectOptions={categorySelectOptions}
        accountFilter={accountFilter}
        accountSelectOptions={accountSelectOptions}
        currencyFilter={currencyFilter}
        setParams={setParams}
      />
      <EntrySearchField value={searchInput} onChange={onSearchInputChange} />
      {hasActiveFilters && <ClearFiltersButton onClear={onClearFilters} />}
      <EntryFilterActions onOpenTransfer={onOpenTransfer} onOpenAdd={onOpenAdd} />
    </Box>
  );
}
