import { Box, Button } from "@mui/material";
import { Plus } from "lucide-react";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import { CATEGORIES, CAT_LABELS, MONTHS } from "../types";
import type { Payee, PropertyServiceType } from "@/types";
import ExpenseSearchField from "./ExpenseSearchField";

interface ExpenseFiltersBarProps {
  now: Date;
  month: number;
  year: number;
  payeeFilter: string[];
  categoryFilter: string[];
  serviceTypeFilter: string[];
  searchInput: string;
  onSearchChange: (v: string) => void;
  payees: Payee[];
  serviceTypes: PropertyServiceType[];
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  setParams: (patch: Record<string, string | undefined>) => void;
  onAdd: () => void;
}

export default function ExpenseFiltersBar({
  now,
  month,
  year,
  payeeFilter,
  categoryFilter,
  serviceTypeFilter,
  searchInput,
  onSearchChange,
  payees,
  serviceTypes,
  hasActiveFilters,
  onClearFilters,
  setParams,
  onAdd,
}: ExpenseFiltersBarProps) {
  const monthOptions: SelectOption[] = MONTHS.map((m, i) => ({ value: String(i + 1), label: m }));
  const yearOptions: SelectOption[] = [2025, 2026, 2027, 2028].map((y) => ({
    value: String(y),
    label: String(y),
  }));
  const categoryOptions: SelectOption[] = CATEGORIES.map((c) => ({
    value: c,
    label: CAT_LABELS[c],
  }));
  const serviceTypeOptions: SelectOption[] = serviceTypes.map((t) => ({
    value: t.id,
    label: t.name,
  }));
  const payeeOptions: SelectOption[] = payees
    .filter((p) => p.isActive)
    .map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` }));

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
      <SearchableSelect
        label="Month"
        value={String(month)}
        options={monthOptions}
        onChange={(v) => setParams({ month: v === String(now.getMonth() + 1) ? undefined : v })}
        sx={{ minWidth: 150 }}
      />
      <SearchableSelect
        label="Year"
        value={String(year)}
        options={yearOptions}
        onChange={(v) => setParams({ year: v === String(now.getFullYear()) ? undefined : v })}
        sx={{ minWidth: 110 }}
      />
      <MultiSearchableSelect
        label="Category"
        value={categoryFilter}
        options={categoryOptions}
        onChange={(v) => setParams({ category: v.length ? v.join(",") : undefined })}
        sx={{ minWidth: 160 }}
      />
      <MultiSearchableSelect
        label="Service Type"
        value={serviceTypeFilter}
        options={serviceTypeOptions}
        onChange={(v) => setParams({ serviceType: v.length ? v.join(",") : undefined })}
        sx={{ minWidth: 170 }}
      />
      <MultiSearchableSelect
        label="Payee"
        value={payeeFilter}
        options={payeeOptions}
        onChange={(v) => setParams({ payee: v.length ? v.join(",") : undefined })}
        sx={{ minWidth: 170 }}
      />
      <ExpenseSearchField value={searchInput} onChange={onSearchChange} />
      {hasActiveFilters && (
        <Button size="small" color="inherit" onClick={onClearFilters}>
          Clear
        </Button>
      )}
      <Box sx={{ ml: "auto" }}>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={onAdd}>
          Add Expense
        </Button>
      </Box>
    </Box>
  );
}
