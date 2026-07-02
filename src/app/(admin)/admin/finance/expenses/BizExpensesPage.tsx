"use client";

import { Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import { useExpenseFilters } from "./hooks/useExpenseFilters";
import { useDebouncedSearch } from "./hooks/useDebouncedSearch";
import { useExpenseList } from "./hooks/useExpenseList";
import { useExpenseMasterData } from "./hooks/useExpenseMasterData";
import { useExpenseForm } from "./hooks/useExpenseForm";
import { useExpenseDelete } from "./hooks/useExpenseDelete";
import ExpenseFiltersBar from "./components/ExpenseFiltersBar";
import ExpenseSummaryCard from "./components/ExpenseSummaryCard";
import ExpenseTable from "./components/ExpenseTable";
import ExpenseFormDrawer from "./components/ExpenseFormDrawer";
import { NO_ACCOUNT } from "./types";

export default function BizExpensesPage() {
  const filters = useExpenseFilters();
  const search = useDebouncedSearch(filters.q, (v) => filters.setParams({ q: v || undefined }));
  const { expenses, loading, total, reload } = useExpenseList(filters);
  const { categories, accounts, allFiscalYears, reload: reloadRefData } = useExpenseMasterData();
  const form = useExpenseForm(categories, accounts, async () => {
    await reload();
    await reloadRefData();
  });
  const del = useExpenseDelete(async () => {
    await reload();
    await reloadRefData();
  });

  const fySelectOptions: SelectOption[] = allFiscalYears.map((fy) => ({ value: fy, label: fy }));
  const categorySelectOptions: SelectOption[] = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const accountSelectOptions: SelectOption[] = [
    { value: NO_ACCOUNT, label: "— none —" },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  // Download mirrors the active fiscal-year filter (the PDF route filters by FY).
  // Use the first selected FY if exactly one is chosen; otherwise no FY param.
  const downloadHref = `/api/admin/finance/expenses/pdf${
    filters.fyFilter.length === 1 ? `?fiscalYear=${filters.fyFilter[0]}` : ""
  }`;

  return (
    <Box>
      <PageHeader title="Business Expenses" subtitle="Tools, subscriptions & operating costs" />

      <ExpenseFiltersBar
        fyFilter={filters.fyFilter}
        fySelectOptions={fySelectOptions}
        categoryFilter={filters.categoryFilter}
        categorySelectOptions={categorySelectOptions}
        activePreset={filters.activePreset}
        from={filters.from}
        to={filters.to}
        searchInput={search.searchInput}
        onSearchChange={search.setSearchInput}
        hasActiveFilters={filters.hasActiveFilters}
        setParams={filters.setParams}
        onPresetChange={filters.onPresetChange}
        onClearFilters={filters.clearFilters}
        downloadHref={downloadHref}
        downloadDisabled={expenses.length === 0}
        onAdd={form.openAdd}
      />

      {!loading && <ExpenseSummaryCard total={total} count={expenses.length} />}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ExpenseTable
          expenses={expenses}
          hasActiveFilters={filters.hasActiveFilters}
          onEdit={form.openEdit}
          onDelete={del.requestDelete}
          onCategoryClick={(categoryId) => filters.setParams({ category: categoryId })}
        />
      )}

      <ExpenseFormDrawer
        open={form.drawerOpen}
        editing={!!form.editing}
        form={form.form}
        onFormChange={form.setForm}
        onDateChange={form.onDateChange}
        categoryOptions={categorySelectOptions}
        accountSelectOptions={accountSelectOptions}
        saving={form.saving}
        error={form.error}
        onSave={form.save}
        onClose={form.closeDrawer}
      />

      <ConfirmDialog
        open={!!del.dialog}
        title={del.dialog?.title ?? ""}
        message={del.dialog?.message ?? ""}
        confirmLabel={del.dialog?.confirmLabel}
        loading={del.loading}
        onConfirm={del.runConfirm}
        onClose={del.closeConfirm}
      />
    </Box>
  );
}
