"use client";

import { useState } from "react";
import { Alert, Box, Snackbar } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useAccountsData } from "./hooks/useAccountsData";
import { useAccountForm } from "./hooks/useAccountForm";
import { useAccountDelete } from "./hooks/useAccountDelete";
import { useAccountTypeOptions } from "./hooks/useAccountTypeOptions";
import AccountsSummary from "./components/AccountsSummary";
import AccountsTable from "./components/AccountsTable";
import AccountFormDrawer from "./components/AccountFormDrawer";

export default function AccountsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const confirm = useConfirmDialog();

  const data = useAccountsData();
  const [editingTypeId, setEditingTypeId] = useState("");
  const accountTypes = useAccountTypeOptions(editingTypeId);
  const form = useAccountForm(accountTypes.types, data.load);
  const { deleteAccount } = useAccountDelete(confirm.openConfirm, data.load, setToast);

  return (
    <Box>
      <PageHeader title="Accounts" subtitle="Cash, bank, mobile wallets & credit cards" />

      <AccountsSummary
        cashRows={data.cashRows}
        cardDebtRows={data.cardDebtRows}
        onAdd={form.openAdd}
      />

      <AccountsTable
        accounts={data.accounts}
        loading={data.loading}
        expandedId={data.expandedId}
        txLoading={data.txLoading}
        txByAccount={data.txByAccount}
        onToggleExpand={data.toggleExpand}
        onEdit={(a) => {
          setEditingTypeId(a.accountTypeId);
          form.openEdit(a);
        }}
        onDelete={deleteAccount}
      />

      <AccountFormDrawer
        open={form.drawerOpen}
        editing={!!form.editing}
        editingHasEntries={form.editingHasEntries}
        form={form.form}
        kind={form.kind}
        typeOptions={accountTypes.options}
        saving={form.saving}
        error={form.error}
        onChange={form.setForm}
        onClose={form.closeDrawer}
        onSave={form.save}
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

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setToast(null)} variant="filled">
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
