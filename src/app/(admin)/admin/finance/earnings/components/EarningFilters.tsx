import { Box } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { ExportFormat } from "@/components/admin/ExportMenuButton";
import type { FilterRangePreset } from "../../format";
import type { TypeFilter } from "../types";
import EarningSelectFilters from "./EarningSelectFilters";
import EarningDateRangeFields from "./EarningDateRangeFields";
import EarningSearchField from "./EarningSearchField";
import EarningFilterActions from "./EarningFilterActions";
import ClearFiltersButton from "./ClearFiltersButton";

interface EarningFiltersProps {
  fyFilter: string[];
  fySelectOptions: SelectOption[];
  sourceFilter: string[];
  sourceSelectOptions: SelectOption[];
  typeFilter: TypeFilter;
  activePreset: FilterRangePreset | "CUSTOM";
  periodSelectOptions: SelectOption[];
  from?: string;
  to?: string;
  searchInput: string;
  hasActiveFilters: boolean;
  hasEarnings: boolean;
  canConvert: boolean;
  exportHrefFor: (format: ExportFormat) => string;
  setParams: (patch: Record<string, string | undefined>) => void;
  onPresetChange: (preset: FilterRangePreset) => void;
  onSearchInputChange: (v: string) => void;
  onClearFilters: () => void;
  onOpenConvert: () => void;
  onOpenAdd: () => void;
}

export default function EarningFilters(props: EarningFiltersProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
      <EarningSelectFilters
        fyFilter={props.fyFilter}
        fySelectOptions={props.fySelectOptions}
        sourceFilter={props.sourceFilter}
        sourceSelectOptions={props.sourceSelectOptions}
        typeFilter={props.typeFilter}
        setParams={props.setParams}
      />
      <SearchableSelect
        label="Period"
        value={props.activePreset}
        options={props.periodSelectOptions}
        onChange={(v) => props.onPresetChange(v as FilterRangePreset)}
        sx={{ minWidth: 170 }}
      />
      <EarningDateRangeFields from={props.from} to={props.to} setParams={props.setParams} />
      <EarningSearchField value={props.searchInput} onChange={props.onSearchInputChange} />
      {props.hasActiveFilters && <ClearFiltersButton onClear={props.onClearFilters} />}
      <EarningFilterActions
        hasEarnings={props.hasEarnings}
        canConvert={props.canConvert}
        exportHrefFor={props.exportHrefFor}
        onOpenConvert={props.onOpenConvert}
        onOpenAdd={props.onOpenAdd}
      />
    </Box>
  );
}
