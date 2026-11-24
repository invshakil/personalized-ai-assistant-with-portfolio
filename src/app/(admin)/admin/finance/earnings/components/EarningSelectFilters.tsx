import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import { TYPE_FILTER_OPTIONS, type TypeFilter } from "../types";

interface EarningSelectFiltersProps {
  fyFilter: string[];
  fySelectOptions: SelectOption[];
  sourceFilter: string[];
  sourceSelectOptions: SelectOption[];
  typeFilter: TypeFilter;
  setParams: (patch: Record<string, string | undefined>) => void;
}

/** The "which earnings" dropdowns: fiscal year, client and income type. */
export default function EarningSelectFilters({
  fyFilter,
  fySelectOptions,
  sourceFilter,
  sourceSelectOptions,
  typeFilter,
  setParams,
}: EarningSelectFiltersProps) {
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
        label="Client"
        value={sourceFilter}
        options={sourceSelectOptions}
        onChange={(ids) => setParams({ source: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 180 }}
      />
      <SearchableSelect
        label="Income type"
        value={typeFilter}
        options={TYPE_FILTER_OPTIONS}
        onChange={(v) => setParams({ type: v === "ALL" ? undefined : v })}
        sx={{ minWidth: 170 }}
      />
    </>
  );
}
