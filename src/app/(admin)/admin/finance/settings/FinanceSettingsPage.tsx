"use client";

import { useState } from "react";
import { Box, CircularProgress, Alert, Snackbar } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useBusinessProfile } from "./hooks/useBusinessProfile";
import { useEmployeesSection } from "./hooks/useEmployeesSection";
import { useSourcesSection } from "./hooks/useSourcesSection";
import { useCategoriesSection } from "./hooks/useCategoriesSection";
import { useSettingsDrawer } from "./hooks/useSettingsDrawer";
import BusinessProfileCard from "./components/BusinessProfileCard";
import EmployeesCard from "./components/EmployeesCard";
import SourcesCard from "./components/SourcesCard";
import CategoriesCard from "./components/CategoriesCard";
import SettingsDrawer from "./components/SettingsDrawer";

export default function FinanceSettingsPage() {
  const [toast, setToast] = useState<string | null>(null);
  const confirm = useConfirmDialog();

  const businessProfile = useBusinessProfile(setToast);
  const employeesSection = useEmployeesSection(confirm.openConfirm, setToast);
  const sourcesSection = useSourcesSection(confirm.openConfirm, setToast);
  const categoriesSection = useCategoriesSection(confirm.openConfirm, setToast);

  const drawer = useSettingsDrawer({
    employee: employeesSection.reload,
    source: sourcesSection.reload,
    category: categoriesSection.reload,
  });

  const loading =
    businessProfile.loading ||
    employeesSection.loading ||
    sourcesSection.loading ||
    categoriesSection.loading;

  if (loading) {
    return (
      <Box>
        <PageHeader
          title="Financial Tracker Settings"
          subtitle="Manage employees, clients & categories"
        />
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Financial Tracker Settings"
        subtitle="Manage employees, clients & categories"
      />

      <BusinessProfileCard
        business={businessProfile.business}
        onChange={businessProfile.setBusiness}
        saving={businessProfile.bizSaving}
        saved={businessProfile.bizSaved}
        onSave={businessProfile.saveBusiness}
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 3 }}>
        <EmployeesCard
          employees={employeesSection.employees}
          onAdd={() => drawer.openAdd("employee")}
          onEdit={(item) => drawer.openEdit("employee", item)}
          onDelete={employeesSection.deleteEmployee}
        />

        <SourcesCard
          sources={sourcesSection.sources}
          onAdd={() => drawer.openAdd("source")}
          onEdit={(item) => drawer.openEdit("source", item)}
          onDelete={sourcesSection.deleteSource}
        />

        <CategoriesCard
          categories={categoriesSection.categories}
          onAdd={() => drawer.openAdd("category")}
          onEdit={(item) => drawer.openEdit("category", item)}
          onDelete={categoriesSection.deleteCategory}
        />
      </Box>

      <SettingsDrawer
        drawer={drawer.drawer}
        onChange={drawer.setDrawer}
        onClose={drawer.closeDrawer}
        saving={drawer.saving}
        error={drawer.error}
        onSave={drawer.save}
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
        <Alert severity="warning" onClose={() => setToast(null)} variant="filled">
          {toast}
        </Alert>
      </Snackbar>
    </Box>
  );
}
