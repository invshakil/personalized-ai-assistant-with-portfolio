"use client";

import { Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import { usePaymentFilters } from "./hooks/usePaymentFilters";
import { usePaymentData } from "./hooks/usePaymentData";
import { usePaymentDrawer } from "./hooks/usePaymentDrawer";
import { usePaymentActions } from "./hooks/usePaymentActions";
import PaymentFiltersBar from "./components/PaymentFilters";
import PaymentSummaryCard from "./components/PaymentSummaryCard";
import PaymentTable from "./components/PaymentTable";
import PaymentDrawer from "./components/PaymentDrawer";
import { NO_ACCOUNT } from "./types";

export default function PaymentsPage() {
  const filters = usePaymentFilters();
  const data = usePaymentData(filters.buildApiFilters);
  const drawer = usePaymentDrawer(data.employees, data.accounts, data.reload);
  const actions = usePaymentActions(data.reload);

  const fySelectOptions: SelectOption[] = data.allFiscalYears.map((fy) => ({
    value: fy,
    label: fy,
  }));
  const empSelectOptions: SelectOption[] = data.employees.map((emp) => ({
    value: emp.id,
    label: emp.name,
  }));
  const clientSelectOptions: SelectOption[] = data.clients.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  const accountSelectOptions: SelectOption[] = [
    { value: NO_ACCOUNT, label: "— none —" },
    ...data.accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <Box>
      <PageHeader title="Employee Salaries" subtitle="Salary & bonus payments to employees" />

      <PaymentFiltersBar
        fyFilter={filters.fyFilter}
        empFilter={filters.empFilter}
        typeFilter={filters.typeFilter}
        clientFilter={filters.clientFilter}
        from={filters.from}
        to={filters.to}
        activePreset={filters.activePreset}
        hasActiveFilters={filters.hasActiveFilters}
        fySelectOptions={fySelectOptions}
        empSelectOptions={empSelectOptions}
        clientSelectOptions={clientSelectOptions}
        setParams={filters.setParams}
        onPresetChange={filters.onPresetChange}
        hasPayments={data.payments.length > 0}
        onDownloadAll={() => actions.downloadAll(filters.fyFilter, filters.empFilter)}
        onAdd={drawer.openAdd}
      />

      {!data.loading && data.payments.length > 0 && (
        <PaymentSummaryCard count={data.payments.length} total={data.total} />
      )}

      {data.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PaymentTable
          payments={data.payments}
          hasActiveFilters={filters.hasActiveFilters}
          onEdit={drawer.openEdit}
          onDelete={actions.requestDelete}
          onDownloadReceipt={actions.downloadReceipt}
        />
      )}

      <PaymentDrawer
        open={drawer.drawerOpen}
        editing={!!drawer.editing}
        form={drawer.form}
        setForm={drawer.setForm}
        employees={data.employees}
        clients={data.clients}
        accountSelectOptions={accountSelectOptions}
        rateLoading={drawer.rateLoading}
        rateNote={drawer.rateNote}
        previewBdt={drawer.previewBdt}
        rateMissing={drawer.rateMissing}
        saving={drawer.saving}
        error={drawer.error}
        onDateChange={drawer.onDateChange}
        onCurrencyChange={drawer.onCurrencyChange}
        onSave={drawer.save}
        onClose={drawer.closeDrawer}
      />

      <ConfirmDialog
        open={!!actions.confirm.dialog}
        title={actions.confirm.dialog?.title ?? ""}
        message={actions.confirm.dialog?.message ?? ""}
        confirmLabel={actions.confirm.dialog?.confirmLabel}
        loading={actions.confirm.loading}
        onConfirm={actions.confirm.runConfirm}
        onClose={actions.confirm.closeConfirm}
      />
    </Box>
  );
}
