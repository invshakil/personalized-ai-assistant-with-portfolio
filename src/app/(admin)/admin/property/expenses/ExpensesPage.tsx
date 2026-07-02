"use client";

import { useRouter } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import { useExpenseFilters } from "./hooks/useExpenseFilters";
import { useDebouncedSearch } from "./hooks/useDebouncedSearch";
import { useExpenseList } from "./hooks/useExpenseList";
import { useExpenseMasterData } from "./hooks/useExpenseMasterData";
import { useExpenseForm } from "./hooks/useExpenseForm";
import ExpenseFiltersBar from "./components/ExpenseFiltersBar";
import ExpenseSummaryCard from "./components/ExpenseSummaryCard";
import ExpenseTable from "./components/ExpenseTable";
import ExpenseFormDrawer from "./components/ExpenseFormDrawer";

export default function ExpensesPage() {
  const router = useRouter();
  const filters = useExpenseFilters();
  const search = useDebouncedSearch(filters.q, (v) => filters.setParams({ q: v || undefined }));
  const { expenses, loading, total, reload } = useExpenseList(filters);
  const { payees, serviceTypes, accounts } = useExpenseMasterData();
  const form = useExpenseForm(filters.month, filters.year, accounts, reload);

  return (
    <Box>
      <PageHeader title="Property Expenses" subtitle="Track monthly property costs" />

      <ExpenseFiltersBar
        now={filters.now}
        month={filters.month}
        year={filters.year}
        payeeFilter={filters.payeeFilter}
        categoryFilter={filters.categoryFilter}
        serviceTypeFilter={filters.serviceTypeFilter}
        searchInput={search.searchInput}
        onSearchChange={search.setSearchInput}
        payees={payees}
        serviceTypes={serviceTypes}
        hasActiveFilters={filters.hasActiveFilters}
        onClearFilters={filters.clearFilters}
        setParams={filters.setParams}
        onAdd={form.openAdd}
      />

      <ExpenseSummaryCard total={total} hasExpenses={expenses.length > 0} />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <ExpenseTable
          expenses={expenses}
          onEdit={form.openEdit}
          onDelete={form.deleteExpense}
          onPayeeClick={(payeeId) => router.push(`/admin/property/payees/${payeeId}`)}
        />
      )}

      <ExpenseFormDrawer
        open={form.drawerOpen}
        editing={!!form.editing}
        form={form.form}
        onFormChange={form.setForm}
        saving={form.saving}
        error={form.error}
        onSave={form.save}
        onClose={form.closeDrawer}
        serviceTypes={serviceTypes}
        payees={payees}
        accounts={accounts}
        expenseAccountId={form.expenseAccountId}
        onAccountChange={form.setExpenseAccountId}
      />
    </Box>
  );
}
