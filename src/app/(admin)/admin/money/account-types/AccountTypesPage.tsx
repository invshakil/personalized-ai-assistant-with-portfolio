"use client";

import { useState } from "react";
import { Alert, Box, Button, FormControlLabel, Snackbar, Switch } from "@mui/material";
import { Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { AccountTypeRow } from "@/types";
import { useAccountTypesData } from "./hooks/useAccountTypesData";
import { useAccountTypeForm } from "./hooks/useAccountTypeForm";
import { useAccountTypeActions } from "./hooks/useAccountTypeActions";
import AccountTypesTable from "./components/AccountTypesTable";
import AccountTypeFormDrawer from "./components/AccountTypeFormDrawer";

export default function AccountTypesPage() {
  const [toast, setToast] = useState<string | null>(null);
  const confirm = useConfirmDialog();

  const data = useAccountTypesData();
  const form = useAccountTypeForm(data.load);
  const actions = useAccountTypeActions(confirm.openConfirm, data.load);

  const reactivate = (t: AccountTypeRow) =>
    actions
      .reactivate(t)
      .catch((e: unknown) => setToast(e instanceof Error ? e.message : "Failed"));

  return (
    <Box>
      <PageHeader
        title="Account Types"
        subtitle="Only active types — and the accounts under them — can be picked anywhere"
      />

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={data.showArchived}
              onChange={(e) => data.setShowArchived(e.target.checked)}
            />
          }
          label={`Show archived (${data.archivedCount})`}
        />
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={form.openAdd}>
          Add Type
        </Button>
      </Box>

      <AccountTypesTable
        rows={data.visible}
        loading={data.loading}
        onEdit={form.openEdit}
        onArchive={actions.archive}
        onReactivate={reactivate}
        onDelete={actions.remove}
      />

      <AccountTypeFormDrawer
        open={form.drawerOpen}
        editing={!!form.editing}
        form={form.form}
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
