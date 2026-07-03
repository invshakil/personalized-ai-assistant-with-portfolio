import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import { SUPPORTED_CURRENCIES } from "@/types";
import type { DirFilter } from "../types";

interface EntryMultiFiltersProps {
  dirFilter: DirFilter;
  categoryFilter: string[];
  categorySelectOptions: SelectOption[];
  accountFilter: string[];
  accountSelectOptions: SelectOption[];
  currencyFilter: string[];
  setParams: (patch: Record<string, string | undefined>) => void;
}

export default function EntryMultiFilters({
  dirFilter,
  categoryFilter,
  categorySelectOptions,
  accountFilter,
  accountSelectOptions,
  currencyFilter,
  setParams,
}: EntryMultiFiltersProps) {
  return (
    <>
      <MultiSearchableSelect
        label="Category"
        value={categoryFilter}
        options={categorySelectOptions}
        disabled={dirFilter === "TRANSFER"}
        onChange={(ids) => setParams({ category: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 180 }}
      />
      <MultiSearchableSelect
        label="Account"
        value={accountFilter}
        options={accountSelectOptions}
        onChange={(ids) => setParams({ account: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 160 }}
      />
      <MultiSearchableSelect
        label="Currency"
        value={currencyFilter}
        options={SUPPORTED_CURRENCIES.map((c) => ({ value: c, label: c }))}
        onChange={(ids) => setParams({ currency: ids.length ? ids.join(",") : undefined })}
        sx={{ minWidth: 140 }}
      />
    </>
  );
}
