"use client";

import { useState } from "react";
import { Box, Snackbar } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { usePeopleData } from "./hooks/usePeopleData";
import { usePersonDrawer } from "./hooks/usePersonDrawer";
import { usePersonDetail } from "./hooks/usePersonDetail";
import { usePersonDeepLink } from "./hooks/usePersonDeepLink";
import PeopleSummaryBar from "./components/PeopleSummaryBar";
import PeopleTable from "./components/PeopleTable";
import PersonDrawer from "./components/PersonDrawer";
import PersonDetailDrawer from "./components/PersonDetailDrawer";

export default function PeoplePage() {
  const [toast, setToast] = useState<string | null>(null);
  const confirm = useConfirmDialog();

  const people = usePeopleData(confirm.openConfirm, setToast);
  const personDrawer = usePersonDrawer(people.reload);
  const detail = usePersonDetail(people.accounts, people.reload);
  usePersonDeepLink(detail.openDetail);

  return (
    <Box>
      <PageHeader title="People & Loans" subtitle="Allowances, loans and who owes whom" />

      <PeopleSummaryBar
        totalOwedByMe={people.totalOwedByMe}
        totalOwedToMe={people.totalOwedToMe}
        onAdd={personDrawer.openAdd}
      />

      <PeopleTable
        people={people.people}
        loading={people.loading}
        onView={detail.openDetail}
        onEdit={personDrawer.openEdit}
        onDelete={people.deletePerson}
      />

      <PersonDrawer
        open={personDrawer.open}
        editing={!!personDrawer.editingId}
        form={personDrawer.form}
        onChange={personDrawer.setForm}
        saving={personDrawer.saving}
        error={personDrawer.error}
        onSave={personDrawer.save}
        onClose={personDrawer.close}
      />

      <PersonDetailDrawer
        open={!!detail.detail || detail.detailLoading}
        loading={detail.detailLoading}
        detail={detail.detail}
        accounts={people.accounts}
        obForm={detail.obForm}
        onObFormChange={detail.setObForm}
        obSaving={detail.obSaving}
        onAddObligation={detail.addObligation}
        payForm={detail.payForm}
        onPayFormChange={detail.setPayForm}
        paySaving={detail.paySaving}
        onRecordPayment={detail.recordPayment}
        addDueId={detail.addDueId}
        addDueAmount={detail.addDueAmount}
        addDueSaving={detail.addDueSaving}
        onStartAddDue={detail.startAddDue}
        onCancelAddDue={detail.cancelAddDue}
        onAddDueAmountChange={detail.setAddDueAmount}
        onAddToDue={detail.addToDue}
        detailError={detail.detailError}
        onClose={detail.closeDetail}
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

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </Box>
  );
}
