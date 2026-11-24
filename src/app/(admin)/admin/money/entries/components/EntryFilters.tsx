import { Box } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { ExportFormat } from "@/components/admin/ExportMenuButton";
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
  /** True until reference data and stored defaults have loaded. */
  actionsDisabled?: boolean;
  /** Export route URL for the ledger as currently filtered. */
  exportHrefFor: (format: ExportFormat) => string;
  exportDisabled?: boolean;
}

export default function EntryFilters(props: EntryFiltersProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
      <SearchableSelect
        label="Period"
        value={props.activePreset}
        options={props.periodSelectOptions}
        onChange={(v) => props.onPresetChange(v as MoneyRange)}
        sx={{ minWidth: 170 }}
      />
      <EntryDateRangeFields from={props.from} to={props.to} setParams={props.setParams} />
      <SearchableSelect
        label="Type"
        value={props.dirFilter}
        options={props.typeSelectOptions}
        onChange={(v) => props.onTypeChange(v as DirFilter)}
        sx={{ minWidth: 140 }}
      />
      <EntryMultiFilters
        dirFilter={props.dirFilter}
        categoryFilter={props.categoryFilter}
        categorySelectOptions={props.categorySelectOptions}
        accountFilter={props.accountFilter}
        accountSelectOptions={props.accountSelectOptions}
        currencyFilter={props.currencyFilter}
        setParams={props.setParams}
      />
      <EntrySearchField value={props.searchInput} onChange={props.onSearchInputChange} />
      {props.hasActiveFilters && <ClearFiltersButton onClear={props.onClearFilters} />}
      <EntryFilterActions
        onOpenTransfer={props.onOpenTransfer}
        onOpenAdd={props.onOpenAdd}
        disabled={props.actionsDisabled}
        exportHrefFor={props.exportHrefFor}
        exportDisabled={props.exportDisabled}
      />
    </Box>
  );
}
