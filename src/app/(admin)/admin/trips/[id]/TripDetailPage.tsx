"use client";

import Link from "next/link";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { MoneyEntryRow } from "@/types";
import { useTripDetail } from "./hooks/useTripDetail";
import { useTripForm } from "../hooks/useTripForm";
import { useTripExpenseDrawer } from "./hooks/useTripExpenseDrawer";
import { useTripBudgets } from "./hooks/useTripBudgets";
import { useFundWalletDrawer } from "./hooks/useFundWalletDrawer";
import { useTripPublish } from "./hooks/useTripPublish";
import TripDetailHeader from "./components/TripDetailHeader";
import TripSummaryRow from "./components/TripSummaryRow";
import TripBudgetPanel from "./components/TripBudgetPanel";
import TripBudgetDrawer from "./components/TripBudgetDrawer";
import TripExpensesTable from "./components/TripExpensesTable";
import TripExpenseDrawer from "./components/TripExpenseDrawer";
import FundWalletDrawer from "./components/FundWalletDrawer";
import TripWalletCard from "./components/TripWalletCard";
import TripBreakdownPanel from "./components/TripBreakdownPanel";
import TripFormDrawer from "../components/TripFormDrawer";

export default function TripDetailPage({ tripId }: { tripId: string }) {
  const { report, expenses, accounts, loading, notFound, reload } = useTripDetail(tripId);

  const tripForm = useTripForm(reload);
  const expenseDrawer = useTripExpenseDrawer(tripId, accounts, reload);
  const budgets = useTripBudgets(tripId, report?.trip.budgets ?? [], reload);
  const fund = useFundWalletDrawer(
    tripId,
    report?.trip.localWalletAccountId ?? null,
    report?.trip.localCurrency ?? "BDT",
    accounts,
    reload
  );
  const publish = useTripPublish(tripId, reload);
  const confirm = useConfirmDialog();

  const askDelete = (r: MoneyEntryRow) =>
    confirm.openConfirm(
      "Delete expense",
      "Remove this expense from the trip and ledger?",
      () => expenseDrawer.remove(r),
      { confirmLabel: "Delete", confirmColor: "error" }
    );

  if (loading && !report) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !report) {
    return (
      <Box>
        <Button component={Link} href="/admin/trips" startIcon={<ArrowBack />} size="small">
          All trips
        </Button>
        <Typography sx={{ py: 4, color: "text.secondary" }}>Trip not found.</Typography>
      </Box>
    );
  }

  const trip = report.trip;

  return (
    <Box>
      <Button
        component={Link}
        href="/admin/trips"
        startIcon={<ArrowBack />}
        size="small"
        sx={{ mb: 1 }}
      >
        All trips
      </Button>

      <TripDetailHeader
        trip={trip}
        publishBusy={publish.busy}
        onEdit={() => tripForm.openEdit(trip)}
        onTogglePublic={publish.toggle}
      />

      <TripSummaryRow report={report} />
      <TripBudgetPanel byCategory={report.byCategory} onEditBudgets={budgets.openEdit} />
      <TripExpensesTable
        expenses={expenses}
        onAdd={expenseDrawer.openAdd}
        onEdit={expenseDrawer.openEdit}
        onDelete={askDelete}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <TripBreakdownPanel byCurrency={report.byCurrency} byDay={report.byDay} />
        <TripWalletCard
          wallet={report.wallet}
          hasWalletAccount={!!trip.localWalletAccountId}
          onFund={fund.openDrawer}
        />
      </Box>

      <TripFormDrawer
        open={tripForm.drawerOpen}
        editing
        form={tripForm.form}
        accounts={accounts}
        saving={tripForm.saving}
        error={tripForm.error}
        onChange={tripForm.setForm}
        onClose={tripForm.closeDrawer}
        onSave={tripForm.save}
      />
      <TripBudgetDrawer
        open={budgets.open}
        form={budgets.form}
        saving={budgets.saving}
        error={budgets.error}
        homeCurrency={trip.homeCurrency}
        onChange={budgets.setForm}
        onClose={budgets.close}
        onSave={budgets.save}
      />
      <TripExpenseDrawer
        open={expenseDrawer.open}
        editing={!!expenseDrawer.editing}
        form={expenseDrawer.form}
        accounts={accounts}
        saving={expenseDrawer.saving}
        error={expenseDrawer.error}
        rateLoading={expenseDrawer.rateLoading}
        currencyOf={expenseDrawer.currencyOf}
        setForm={expenseDrawer.setForm}
        onAccountChange={expenseDrawer.setAccount}
        onClose={expenseDrawer.close}
        onSave={expenseDrawer.save}
      />
      <FundWalletDrawer
        open={fund.open}
        form={fund.form}
        accounts={accounts}
        walletAccountId={trip.localWalletAccountId}
        walletAccountName={trip.localWalletAccountName}
        localCurrency={trip.localCurrency}
        rateNote={fund.rateNote}
        saving={fund.saving}
        error={fund.error}
        setForm={fund.setForm}
        onPrefillRate={fund.prefillRate}
        onClose={fund.close}
        onSave={fund.save}
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
