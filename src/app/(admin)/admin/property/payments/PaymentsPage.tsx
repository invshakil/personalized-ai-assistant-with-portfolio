"use client";

import { useState, useEffect } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";
import { usePaymentFilters } from "./hooks/usePaymentFilters";
import { usePaymentData } from "./hooks/usePaymentData";
import { usePaymentSummary } from "./hooks/usePaymentSummary";
import { usePaymentRowExpansion } from "./hooks/usePaymentRowExpansion";
import { useDropdownOptions } from "./hooks/useDropdownOptions";
import { useMoneyAccounts } from "./hooks/useMoneyAccounts";
import { usePaymentDrawer } from "./hooks/usePaymentDrawer";
import { useEditPayment } from "./hooks/useEditPayment";
import { useEditTransaction } from "./hooks/useEditTransaction";
import { usePaymentActions } from "./hooks/usePaymentActions";
import { useOneOffCharges } from "./hooks/useOneOffCharges";
import { useVouchers } from "./hooks/useVouchers";
import PaymentFilters from "./components/PaymentFilters";
import PaymentSummaryStrip from "./components/PaymentSummaryStrip";
import OverdueAlert from "./components/OverdueAlert";
import PaymentTable from "./components/PaymentTable";
import EditPaymentDrawer from "./components/EditPaymentDrawer";
import EditTransactionDrawer from "./components/EditTransactionDrawer";
import PaymentDrawer from "./components/PaymentDrawer";
import BillLineDrawer from "./components/BillLineDrawer";

export default function PaymentsPage() {
  const filters = usePaymentFilters();
  const data = usePaymentData(filters);
  const summary = usePaymentSummary(data.payments);
  const rowExpansion = usePaymentRowExpansion();
  const accounts = useMoneyAccounts();

  const [units, setUnits] = useState<UnitWithTenant[]>([]);
  useEffect(() => {
    propertyApi.listUnits().then((u) => setUnits(u ?? []));
  }, []);
  const dropdownOptions = useDropdownOptions(units, data.payments);

  const paymentDrawer = usePaymentDrawer(accounts, data.reload);
  const editPayment = useEditPayment(data.reload);
  const editTransaction = useEditTransaction(data.reload);
  const charges = useOneOffCharges(data.reload);
  const vouchers = useVouchers(data.reload);
  const actions = usePaymentActions(data.reload);

  return (
    <Box>
      <PageHeader title="Monthly Payments" subtitle="Track and record rent payments" />

      <PaymentFilters
        now={filters.now}
        month={filters.month}
        year={filters.year}
        isAllMonths={filters.isAllMonths}
        unitFilter={filters.unitFilter}
        tenantFilter={filters.tenantFilter}
        unitOptions={dropdownOptions.unitOptions}
        tenantOptions={dropdownOptions.tenantOptions}
        monthOptions={dropdownOptions.monthOptions}
        yearOptions={dropdownOptions.yearOptions}
        hasActiveFilters={filters.hasActiveFilters}
        setParams={filters.setParams}
        generating={data.generating}
        onRegenerate={data.regenerateMonth}
        hasPayments={data.payments.length > 0}
      />

      {data.genMsg && (
        <Alert severity="success" onClose={() => data.setGenMsg(null)} sx={{ mb: 2 }}>
          {data.genMsg}
        </Alert>
      )}

      <PaymentSummaryStrip
        totalExpected={summary.totalExpected}
        totalCollected={summary.totalCollected}
        totalAdvanceApplied={summary.totalAdvanceApplied}
        totalOutstanding={summary.totalOutstanding}
        overdueCount={summary.overdueCount}
      />

      <OverdueAlert
        overdueCount={summary.overdueCount}
        isAllMonths={filters.isAllMonths}
        month={filters.month}
        year={filters.year}
      />

      {data.loading || data.generating ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <PaymentTable
          payments={data.payments}
          isAllMonths={filters.isAllMonths}
          expanded={rowExpansion.expanded}
          onToggleExpand={rowExpansion.toggleExpand}
          onEdit={editPayment.openEditPayment}
          onRecordPayment={(p) => paymentDrawer.openPayDrawer(p, "pay")}
          onApplyAdvance={(p) => paymentDrawer.openPayDrawer(p, "advance")}
          onManageCharges={charges.open}
          onManageVouchers={vouchers.open}
          onDelete={actions.deletePayment}
          onEditTx={editTransaction.openEditTx}
          onDeleteTx={actions.deleteTransaction}
        />
      )}

      <EditPaymentDrawer
        payment={editPayment.editPayment}
        onChange={editPayment.updateEditPayment}
        loading={editPayment.editPaymentLoading}
        error={editPayment.editPaymentError}
        onSave={editPayment.submitEditPayment}
        onClose={editPayment.closeEditPayment}
      />

      <EditTransactionDrawer
        open={!!editTransaction.editTx}
        type={editTransaction.editTxType}
        onTypeChange={editTransaction.setEditTxType}
        amount={editTransaction.editTxAmount}
        onAmountChange={editTransaction.setEditTxAmount}
        date={editTransaction.editTxDate}
        onDateChange={editTransaction.setEditTxDate}
        notes={editTransaction.editTxNotes}
        onNotesChange={editTransaction.setEditTxNotes}
        loading={editTransaction.editTxLoading}
        error={editTransaction.editTxError}
        onSave={editTransaction.submitEditTransaction}
        onClose={editTransaction.closeEditTx}
      />

      <PaymentDrawer
        drawer={paymentDrawer.drawer}
        onClose={paymentDrawer.closeDrawer}
        txType={paymentDrawer.txType}
        onTxTypeChange={paymentDrawer.changeTxType}
        accounts={accounts}
        accountOptions={paymentDrawer.accountOptions}
        txAccountId={paymentDrawer.txAccountId}
        onTxAccountChange={paymentDrawer.setTxAccountId}
        txAmount={paymentDrawer.txAmount}
        onTxAmountChange={paymentDrawer.setTxAmount}
        txDate={paymentDrawer.txDate}
        onTxDateChange={paymentDrawer.setTxDate}
        txNotes={paymentDrawer.txNotes}
        onTxNotesChange={paymentDrawer.setTxNotes}
        txLoading={paymentDrawer.txLoading}
        txError={paymentDrawer.txError}
        onSubmit={paymentDrawer.submitTransaction}
      />

      <BillLineDrawer
        variant="charge"
        target={charges.target}
        lines={charges.lines}
        label={charges.label}
        onLabelChange={charges.setLabel}
        amount={charges.amount}
        onAmountChange={charges.setAmount}
        notes={charges.notes}
        onNotesChange={charges.setNotes}
        loading={charges.loading}
        error={charges.error}
        onAdd={charges.add}
        onRemove={charges.remove}
        onClose={charges.close}
      />

      <BillLineDrawer
        variant="voucher"
        target={vouchers.target}
        lines={vouchers.lines}
        label={vouchers.label}
        onLabelChange={vouchers.setLabel}
        amount={vouchers.amount}
        onAmountChange={vouchers.setAmount}
        notes={vouchers.notes}
        onNotesChange={vouchers.setNotes}
        loading={vouchers.loading}
        error={vouchers.error}
        onAdd={vouchers.add}
        onRemove={vouchers.remove}
        onClose={vouchers.close}
      />
    </Box>
  );
}
