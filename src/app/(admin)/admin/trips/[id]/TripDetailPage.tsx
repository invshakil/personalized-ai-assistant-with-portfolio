"use client";

import Link from "next/link";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { TripExpenseRow, TripParticipantRow, TripSettlementRow } from "@/types";
import { useTripDetail } from "./hooks/useTripDetail";
import { useTripForm } from "../hooks/useTripForm";
import { useTripExpenseDrawer } from "./hooks/useTripExpenseDrawer";
import { useTripParticipants } from "./hooks/useTripParticipants";
import { useTripSettlements } from "./hooks/useTripSettlements";
import { useTripBudgets } from "./hooks/useTripBudgets";
import { useFundWalletDrawer } from "./hooks/useFundWalletDrawer";
import { useTripPublish } from "./hooks/useTripPublish";
import TripDetailHeader from "./components/TripDetailHeader";
import TripSummaryRow from "./components/TripSummaryRow";
import ParticipantsPanel from "./components/ParticipantsPanel";
import ParticipantDrawer from "./components/ParticipantDrawer";
import TripBudgetPanel from "./components/TripBudgetPanel";
import TripBudgetDrawer from "./components/TripBudgetDrawer";
import TripExpensesTable from "./components/TripExpensesTable";
import TripExpenseDrawer from "./components/TripExpenseDrawer";
import SettlementPanel from "./components/SettlementPanel";
import SettlementDrawer from "./components/SettlementDrawer";
import WhoOwesWhom from "./components/WhoOwesWhom";
import FundWalletDrawer from "./components/FundWalletDrawer";
import TripWalletCard from "./components/TripWalletCard";
import TripBreakdownPanel from "./components/TripBreakdownPanel";
import TripFormDrawer from "../components/TripFormDrawer";

export default function TripDetailPage({ tripId }: { tripId: string }) {
  const { report, expenses, participants, settlements, accounts, loading, notFound, reload } =
    useTripDetail(tripId);

  const activeParticipants = participants.filter((p) => p.isActive);

  const tripForm = useTripForm(reload);
  const expenseDrawer = useTripExpenseDrawer(tripId, accounts, participants, reload);
  const people = useTripParticipants(tripId, reload);
  const settle = useTripSettlements(tripId, reload);
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

  const askDeleteExpense = (r: TripExpenseRow) =>
    confirm.openConfirm(
      "Delete expense",
      "Remove this expense (and any linked ledger entry)?",
      () => expenseDrawer.remove(r),
      { confirmLabel: "Delete", confirmColor: "error" }
    );

  const askDeleteParticipant = (p: TripParticipantRow) =>
    confirm.openConfirm(
      "Remove person",
      `Remove ${p.name} from this trip? If they have expenses or payments, they're kept but marked removed.`,
      () => people.remove(p),
      { confirmLabel: "Remove", confirmColor: "error" }
    );

  const askDeleteSettlement = (s: TripSettlementRow) =>
    confirm.openConfirm(
      "Delete payment",
      "Remove this payment/contribution?",
      () => settle.remove(s),
      {
        confirmLabel: "Delete",
        confirmColor: "error",
      }
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
      <ParticipantsPanel
        participants={participants}
        onAdd={people.openAdd}
        onEdit={people.openEdit}
        onDelete={askDeleteParticipant}
      />
      <TripBudgetPanel byCategory={report.byCategory} onEditBudgets={budgets.openEdit} />
      <TripExpensesTable
        expenses={expenses}
        onAdd={expenseDrawer.openAdd}
        onEdit={expenseDrawer.openEdit}
        onDelete={askDeleteExpense}
      />
      <SettlementPanel
        settlements={settlements}
        onAdd={settle.openDrawer}
        onDelete={askDeleteSettlement}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <WhoOwesWhom participants={report.participants} owes={report.owes} />
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
      <ParticipantDrawer
        open={people.open}
        editing={!!people.editing}
        form={people.form}
        beneficiaries={people.beneficiaries}
        saving={people.saving}
        error={people.error}
        setForm={people.setForm}
        onClose={people.close}
        onSave={people.save}
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
        active={expenseDrawer.active}
        accounts={accounts}
        saving={expenseDrawer.saving}
        error={expenseDrawer.error}
        rateLoading={expenseDrawer.rateLoading}
        payerIsSelf={expenseDrawer.payerIsSelf}
        setForm={expenseDrawer.setForm}
        onPayerChange={expenseDrawer.setPayer}
        onAccountChange={expenseDrawer.setAccount}
        onCurrencyChange={expenseDrawer.setCurrency}
        onMode={expenseDrawer.setMode}
        onToggle={expenseDrawer.toggleParticipant}
        onSelectAll={expenseDrawer.selectAll}
        onSelectOnlyPayer={expenseDrawer.selectOnlyPayer}
        onExact={expenseDrawer.setExact}
        onClose={expenseDrawer.close}
        onSave={expenseDrawer.save}
      />
      <SettlementDrawer
        open={settle.open}
        form={settle.form}
        participants={activeParticipants}
        saving={settle.saving}
        error={settle.error}
        rateLoading={settle.rateLoading}
        setForm={settle.setForm}
        onCurrencyChange={settle.setCurrency}
        onClose={settle.close}
        onSave={settle.save}
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
