import { Box } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import type { FilterRangePreset } from "../../format";
import EarningDateRangeFields from "./EarningDateRangeFields";
import EarningSearchField from "./EarningSearchField";
import EarningFilterActions from "./EarningFilterActions";
import ClearFiltersButton from "./ClearFiltersButton";

interface EarningFiltersProps {
  fyFilter: string[];
  fySelectOptions: SelectOption[];
  sourceFilter: string[];
  sourceSelectOptions: SelectOption[];
  activePreset: FilterRangePreset | "CUSTOM";
  periodSelectOptions: SelectOption[];
  from?: string;
  to?: string;
  searchInput: string;
  hasActiveFilters: boolean;
  hasEarnings: boolean;
  hasPendingEarnings: boolean;
  downloadHref: string;
  setParams: (patch: Record<string, string | undefined>) => void;
  onPresetChange: (preset: FilterRangePreset) => void;
  onSearchInputChange: (v: string) => void;
  onOpenConvert: () => void;
  onOpenAdd: () => void;
}

export default function EarningFilters({
  fyFilter,
  fySelectOptions,
  sourceFilter,
  sourceSelectOptions,
  activePreset,
  periodSelectOptions,
  from,
  to,
  searchInput,
  hasActiveFilters,
  hasEarnings,
  hasPendingEarnings,
  downloadHref,
  setParams,
  onPresetChange,
  onSearchInputChange,
  onOpenConvert,
  onOpenAdd,
}: EarningFiltersProps) {
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
        label="Client"
        value={sourceFilter}
        options={sourceSelectOptions}
        onChange={(ids) => setParams({ source: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 180 }}
      />
      <SearchableSelect
        label="Period"
        value={activePreset}
        options={periodSelectOptions}
        onChange={(v) => onPresetChange(v as FilterRangePreset)}
        sx={{ minWidth: 170 }}
      />
      <EarningDateRangeFields from={from} to={to} setParams={setParams} />
      <EarningSearchField value={searchInput} onChange={onSearchInputChange} />
      {hasActiveFilters && (
        <ClearFiltersButton
          onClear={() =>
            setParams({
              fy: undefined,
              source: undefined,
              period: undefined,
              from: undefined,
              to: undefined,
              q: undefined,
            })
          }
        />
      )}
      <EarningFilterActions
        hasEarnings={hasEarnings}
        hasPendingEarnings={hasPendingEarnings}
        downloadHref={downloadHref}
        onOpenConvert={onOpenConvert}
        onOpenAdd={onOpenAdd}
      />
    </Box>
  );
}
