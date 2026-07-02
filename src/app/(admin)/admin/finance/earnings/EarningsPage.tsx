"use client";

import { Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import { FILTER_RANGE_PRESETS, FILTER_RANGE_LABELS } from "../format";
import { useEarningFilters } from "./hooks/useEarningFilters";
import { useEarningData } from "./hooks/useEarningData";
import { useEarningDrawer } from "./hooks/useEarningDrawer";
import { useConvertDrawer } from "./hooks/useConvertDrawer";
import { useEarningActions } from "./hooks/useEarningActions";
import { NO_ACCOUNT } from "./types";
import EarningFilters from "./components/EarningFilters";
import EarningSummary from "./components/EarningSummary";
import EarningTable from "./components/EarningTable";
import EarningDrawer from "./components/EarningDrawer";
import ConvertDrawer from "./components/ConvertDrawer";

export default function EarningsPage() {
  const filters = useEarningFilters();
  const data = useEarningData(filters);
  const confirm = useConfirmDialog();

  const reloadAll = async () => {
    await Promise.all([data.reload(), data.reloadRefData()]);
  };

  const earningDrawer = useEarningDrawer(data.sources, data.accounts, reloadAll);
  const convertDrawer = useConvertDrawer(data.accounts, data.pendingEarnings, reloadAll);
  const actions = useEarningActions(confirm, reloadAll);

  const total = data.earnings.reduce((s, e) => s + e.amount, 0);

  const periodSelectOptions: SelectOption[] = [
    ...FILTER_RANGE_PRESETS.map((p) => ({ value: p, label: FILTER_RANGE_LABELS[p] })),
    ...(filters.activePreset === "CUSTOM"
      ? [{ value: "CUSTOM", label: "Custom range", disabled: true }]
      : []),
  ];
  const fySelectOptions: SelectOption[] = data.allFiscalYears.map((fy) => ({
    value: fy,
    label: fy,
  }));
  const sourceSelectOptions: SelectOption[] = data.sources.map((s) => ({
    value: s.id,
    label: s.name,
  }));
  const accountSelectOptions: SelectOption[] = [
    { value: NO_ACCOUNT, label: "— none —" },
    ...data.accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  // Download mirrors the active fiscal-year filter (the PDF route filters by FY).
  // Use the first selected FY if exactly one is chosen; otherwise no FY param.
  const downloadHref = `/api/admin/finance/earnings/pdf${
    filters.fyFilter.length === 1 ? `?fiscalYear=${filters.fyFilter[0]}` : ""
  }`;

  const hasEarnings = data.earnings.length > 0;

  return (
    <Box>
      <PageHeader title="Earnings" subtitle="Client income log" />

      <EarningFilters
        fyFilter={filters.fyFilter}
        fySelectOptions={fySelectOptions}
        sourceFilter={filters.sourceFilter}
        sourceSelectOptions={sourceSelectOptions}
        activePreset={filters.activePreset}
        periodSelectOptions={periodSelectOptions}
        from={filters.from}
        to={filters.to}
        searchInput={filters.searchInput}
        hasActiveFilters={filters.hasActiveFilters}
        hasEarnings={hasEarnings}
        hasPendingEarnings={data.pendingEarnings.length > 0}
        downloadHref={downloadHref}
        setParams={filters.setParams}
        onPresetChange={filters.onPresetChange}
        onSearchInputChange={filters.setSearchInput}
        onOpenConvert={() => convertDrawer.openConvert()}
        onOpenAdd={earningDrawer.openAdd}
      />

      {!data.loading && (
        <EarningSummary
          earningsCount={data.earnings.length}
          total={total}
          fyFilter={filters.fyFilter}
          pendingByCurrency={convertDrawer.pendingByCurrency}
        />
      )}

      {data.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <EarningTable
          earnings={data.earnings}
          hasActiveFilters={filters.hasActiveFilters}
          reversingId={actions.reversingId}
          onConvert={(currency, id) => convertDrawer.openConvert(currency, id)}
          onReverse={actions.doReverse}
          onEdit={earningDrawer.openEdit}
          onDelete={actions.requestDelete}
        />
      )}

      <EarningDrawer
        open={earningDrawer.drawerOpen}
        editing={earningDrawer.editing}
        form={earningDrawer.form}
        setForm={earningDrawer.setForm}
        sources={data.sources}
        accountSelectOptions={accountSelectOptions}
        saving={earningDrawer.saving}
        error={earningDrawer.error}
        rateLoading={earningDrawer.rateLoading}
        rateNote={earningDrawer.rateNote}
        previewBdt={earningDrawer.previewBdt}
        rateMissing={earningDrawer.rateMissing}
        onClose={earningDrawer.closeDrawer}
        onDateChange={earningDrawer.onDateChange}
        onCurrencyChange={earningDrawer.onCurrencyChange}
        onSave={earningDrawer.save}
      />

      <ConvertDrawer
        open={convertDrawer.convertOpen}
        onClose={convertDrawer.closeConvert}
        pendingCurrencies={convertDrawer.pendingCurrencies}
        convCurrency={convertDrawer.convCurrency}
        onConvCurrencyChange={convertDrawer.onConvCurrencyChange}
        convList={convertDrawer.convList}
        convSelected={convertDrawer.convSelected}
        onToggleSelect={convertDrawer.toggleConvSelect}
        convFrom={convertDrawer.convFrom}
        onConvFromChange={convertDrawer.setConvFrom}
        convTo={convertDrawer.convTo}
        onConvToChange={convertDrawer.setConvTo}
        convDate={convertDrawer.convDate}
        onConvDateChange={convertDrawer.setConvDate}
        convToAmount={convertDrawer.convToAmount}
        onConvToAmountChange={convertDrawer.setConvToAmount}
        convRateLoading={convertDrawer.convRateLoading}
        fromAccountOptions={convertDrawer.fromAccountOptions}
        toAccountOptions={convertDrawer.toAccountOptions}
        convTotalOriginal={convertDrawer.convTotalOriginal}
        convChosenCount={convertDrawer.convChosen.length}
        convRate={convertDrawer.convRate}
        convToAmountNum={convertDrawer.convToAmountNum}
        convVariance={convertDrawer.convVariance}
        convError={convertDrawer.convError}
        convSaving={convertDrawer.convSaving}
        convReady={convertDrawer.convReady}
        onConvert={convertDrawer.doConvert}
      />

      <ConfirmDialog
        open={!!confirm.dialog}
        title={confirm.dialog?.title ?? ""}
        message={confirm.dialog?.message ?? ""}
        confirmLabel={confirm.dialog?.confirmLabel}
        confirmColor={confirm.dialog?.confirmColor}
        loading={confirm.loading}
        onConfirm={confirm.runConfirm}
        onClose={confirm.closeConfirm}
      />
    </Box>
  );
}
