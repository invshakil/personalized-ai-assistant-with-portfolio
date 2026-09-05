"use client";

import { Box } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useCategoriesData } from "./hooks/useCategoriesData";
import { useCategoryForm } from "./hooks/useCategoryForm";
import { useCategoryDelete } from "./hooks/useCategoryDelete";
import CategoriesToolbar from "./components/CategoriesToolbar";
import CategoriesTable from "./components/CategoriesTable";
import CategoryFormDrawer from "./components/CategoryFormDrawer";

export default function CategoriesPage() {
  const confirm = useConfirmDialog();

  const data = useCategoriesData();
  const form = useCategoryForm(data.load);
  const { deleteCategory } = useCategoryDelete(confirm.openConfirm, data.load);

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
