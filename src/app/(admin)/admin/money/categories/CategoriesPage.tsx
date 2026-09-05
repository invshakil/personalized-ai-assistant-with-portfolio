"use client";

import { useState } from "react";
import { Alert, Box, Snackbar } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCategoriesData } from "./hooks/useCategoriesData";
import { useCategoryForm } from "./hooks/useCategoryForm";
import { useCategoryDelete } from "./hooks/useCategoryDelete";
import { useCategoryMerge } from "./hooks/useCategoryMerge";
import CategoriesToolbar from "./components/CategoriesToolbar";
import CategoriesTable from "./components/CategoriesTable";
import CategoryFormDrawer from "./components/CategoryFormDrawer";
import MergeCategoryDialog from "./components/MergeCategoryDialog";

export default function CategoriesPage() {
  const [toast, setToast] = useState<string | null>(null);
  const confirm = useConfirmDialog();

  const data = useCategoriesData();
  const form = useCategoryForm(data.load);
  const { deleteCategory } = useCategoryDelete(confirm.openConfirm, data.load);
  const merge = useCategoryMerge(data.categories, (message) => {
    setToast(message);
    data.load();
  });

  return (
    <Box>
      <PageHeader title="Categories" subtitle="Income & expense categories for your ledger" />

      <CategoriesToolbar query={data.query} onQueryChange={data.setQuery} onAdd={form.openAdd} />

      <CategoriesTable
        rows={data.filtered}
        loading={data.loading}
        emptyMessage={
          data.categories.length === 0 ? "No categories yet" : `No categories match "${data.query}"`
        }
        onEdit={form.openEdit}
        onMerge={merge.openMerge}
        onDelete={deleteCategory}
      />

      <CategoryFormDrawer
        open={form.drawerOpen}
        editing={!!form.editing}
        form={form.form}
        saving={form.saving}
        error={form.error}
        onChange={form.setForm}
        onClose={form.closeDrawer}
        onSave={form.save}
      />

      <MergeCategoryDialog
        open={merge.open}
        source={merge.source}
        targetId={merge.targetId}
        targetOptions={merge.targetOptions}
        deleteSource={merge.deleteSource}
        merging={merge.merging}
        error={merge.error}
        onTargetChange={merge.setTargetId}
        onDeleteSourceChange={merge.setDeleteSource}
        onClose={merge.closeMerge}
        onConfirm={merge.merge}
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
        autoHideDuration={6000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" onClose={() => setToast(null)} variant="filled">
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
