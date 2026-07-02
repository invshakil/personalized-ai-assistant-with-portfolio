"use client";

import { Box, Button, Alert } from "@mui/material";
import { Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useServiceTypesCatalog } from "./hooks/useServiceTypesCatalog";
import { useServiceTypeDelete } from "./hooks/useServiceTypeDelete";
import ServiceTypesTable from "./components/ServiceTypesTable";
import ServiceTypeFormDrawer from "./components/ServiceTypeFormDrawer";

export default function ServiceTypesPage() {
  const catalog = useServiceTypesCatalog();
  const del = useServiceTypeDelete(catalog.reload);

  return (
    <Box>
      <PageHeader title="Service Types" subtitle="Categories for property expense classification" />

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={catalog.openAdd}>
          Add Service Type
        </Button>
      </Box>

      {del.deleteError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={del.clearDeleteError}>
          {del.deleteError}
        </Alert>
      )}

      <ServiceTypesTable
        types={catalog.types}
        loading={catalog.loading}
        onEdit={catalog.openEdit}
        onToggleActive={catalog.toggleActive}
        onDelete={del.requestDelete}
      />

      <ServiceTypeFormDrawer
        open={catalog.drawerOpen}
        editing={!!catalog.editing}
        form={catalog.form}
        onFormChange={catalog.setForm}
        saving={catalog.saving}
        error={catalog.error}
        onSave={catalog.save}
        onClose={catalog.closeDrawer}
      />

      <ConfirmDialog
        open={!!del.pendingDelete}
        title="Delete service type"
        message={`Delete "${del.pendingDelete?.name ?? ""}"? This deactivates the type. It is blocked if any expense still uses it.`}
        confirmLabel="Delete"
        loading={del.deleting}
        onConfirm={del.confirmDelete}
        onClose={del.cancelDelete}
      />
    </Box>
  );
}
