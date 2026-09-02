"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { MONEY_RANGE_LABELS, type MoneyRange } from "../format";
import { useEntryFilters } from "./hooks/useEntryFilters";
import { useEntryData } from "./hooks/useEntryData";
import { useEntryDrawer } from "./hooks/useEntryDrawer";
import { useTransferDrawer } from "./hooks/useTransferDrawer";
import { useEntryActions } from "./hooks/useEntryActions";
import type { DirFilter } from "./types";
import EntryFilters from "./components/EntryFilters";
import EntrySummary from "./components/EntrySummary";
import EntryTable from "./components/EntryTable";
import EntryDrawer from "./components/EntryDrawer";
import TransferDrawer from "./components/TransferDrawer";

export default function EntriesPage() {
  const searchParams = useSearchParams();
  const filters = useEntryFilters();
  const data = useEntryData(filters);
  const confirm = useConfirmDialog();

  const reloadAll = async () => {
    await Promise.all([data.reload(), data.reloadRefData()]);
  };

  const entryDrawer = useEntryDrawer(
    data.accounts,
    data.categories,
    searchParams,
    filters.setParams,
    reloadAll
  );
  const accountIds = useMemo(() => data.accounts.map((a) => a.id), [data.accounts]);
  const transferDrawer = useTransferDrawer(reloadAll, accountIds);
  const actions = useEntryActions(confirm, reloadAll);

  const categoryOptions = useMemo(() => {
    if (filters.dirFilter === "CREDIT") return data.categories.filter((c) => c.kind === "INCOME");
    if (filters.dirFilter === "DEBIT") return data.categories.filter((c) => c.kind === "EXPENSE");
    return data.categories;
  }, [data.categories, filters.dirFilter]);

  // Both drawers seed their dropdowns once, on open, and never re-seed. Opening
  // one before the accounts, categories or stored defaults have arrived produces
  // a form quietly missing its defaults, so the buttons wait for all three.
  const formsReady = !data.loading && entryDrawer.defaultsLoaded;

  const handleTypeChange = (next: DirFilter) => filters.onTypeChange(next, data.categories);
  const handleCategoryClick = (categoryId: string) => filters.setParams({ category: categoryId });
  const handleAccountClick = (accountId: string) => filters.setParams({ account: accountId });

  const periodSelectOptions: SelectOption[] = [
    ...(Object.keys(MONEY_RANGE_LABELS) as MoneyRange[]).map((r) => ({
      value: r,
      label: MONEY_RANGE_LABELS[r],
    })),
    ...(filters.activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];
  const typeSelectOptions: SelectOption[] = [
    { value: "ALL", label: "All types" },
    { value: "CREDIT", label: "Income" },
    { value: "DEBIT", label: "Expense" },
    { value: "TRANSFER", label: "Transfer" },
  ];
  const categorySelectOptions: SelectOption[] = categoryOptions.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const accountSelectOptions: SelectOption[] = data.accounts.map((a) => ({
    value: a.id,
    label: a.name,
  }));

  return (
    <Box>
      <PageHeader title="Ledger" subtitle="Every income, expense and transfer" />

      <EntryFilters
        activePreset={filters.activePreset}
        periodSelectOptions={periodSelectOptions}
        from={filters.from}
        to={filters.to}
        dirFilter={filters.dirFilter}
        typeSelectOptions={typeSelectOptions}
        categoryFilter={filters.categoryFilter}
        categorySelectOptions={categorySelectOptions}
        accountFilter={filters.accountFilter}
        accountSelectOptions={accountSelectOptions}
        currencyFilter={filters.currencyFilter}
        searchInput={filters.searchInput}
        hasActiveFilters={filters.hasActiveFilters}
        setParams={filters.setParams}
        onPresetChange={filters.onPresetChange}
        onTypeChange={handleTypeChange}
        onSearchInputChange={filters.setSearchInput}
        onClearFilters={filters.clearFilters}
        onOpenTransfer={transferDrawer.openTransfer}
        onOpenAdd={entryDrawer.openAdd}
        actionsDisabled={!formsReady}
      />

      {!data.loading && (
        <EntrySummary entriesCount={data.entries.length} totalsByCurrency={data.totalsByCurrency} />
      )}

      {data.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <EntryTable
          entries={data.entries}
          hasActiveFilters={filters.hasActiveFilters}
          hasCustomRange={filters.hasCustomRange}
          sortBy={filters.sortBy}
          sortDir={filters.sortDir}
          accountName={data.accountName}
          onToggleSort={filters.toggleSort}
          onEdit={entryDrawer.openEdit}
          onDelete={actions.requestDelete}
          onTypeClick={handleTypeChange}
          onCategoryClick={handleCategoryClick}
          onAccountClick={handleAccountClick}
        />
      )}

      <EntryDrawer
        open={entryDrawer.drawerOpen}
        editing={entryDrawer.editing}
        form={entryDrawer.form}
        setForm={entryDrawer.setForm}
        accounts={data.accounts}
        formCategories={entryDrawer.formCategories}
        beneficiaries={data.beneficiaries}
        saving={entryDrawer.saving}
        error={entryDrawer.error}
        linkLoading={entryDrawer.linkLoading}
        linkObligationOptions={entryDrawer.linkObligationOptions}
        selectedObligation={entryDrawer.selectedObligation}
        onClose={entryDrawer.closeDrawer}
        onDirectionChange={entryDrawer.setDirection}
        onSave={entryDrawer.save}
      />

      <TransferDrawer
        open={transferDrawer.transferOpen}
        transfer={transferDrawer.transfer}
        setTransfer={transferDrawer.setTransfer}
        accounts={data.accounts}
        transferSaving={transferDrawer.transferSaving}
        transferError={transferDrawer.transferError}
        onClose={transferDrawer.closeTransfer}
        onSave={transferDrawer.saveTransfer}
      />

      <ConfirmDialog
        open={!!confirm.dialog}
        title={confirm.dialog?.title ?? ""}
        message={confirm.dialog?.message ?? ""}
        confirmLabel={confirm.dialog?.confirmLabel}
        confirmColor={confirm.dialog?.confirmColor}
        loading={confirm.loading}
        error={confirm.error}
        onConfirm={confirm.runConfirm}
        onClose={confirm.closeConfirm}
      />
    </Box>
  );
}
