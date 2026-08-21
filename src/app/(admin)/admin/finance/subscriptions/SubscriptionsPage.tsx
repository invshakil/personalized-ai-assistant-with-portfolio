"use client";

import { Box } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { type SelectOption } from "@/components/admin/SearchableSelect";
import { useSubscriptionFilters } from "./hooks/useSubscriptionFilters";
import { useSubscriptionData } from "./hooks/useSubscriptionData";
import { useSubscriptionForm } from "./hooks/useSubscriptionForm";
import { useSubscriptionActions } from "./hooks/useSubscriptionActions";
import { useSubscriptionManage } from "./hooks/useSubscriptionManage";
import { useRateChangeForm } from "./hooks/useRateChangeForm";
import { useChargeOverride } from "./hooks/useChargeOverride";
import SubscriptionFilters from "./components/SubscriptionFilters";
import SubscriptionTable from "./components/SubscriptionTable";
import SubscriptionFormDrawer from "./components/SubscriptionFormDrawer";
import ManageDrawer from "./components/ManageDrawer";

export default function SubscriptionsPage() {
  const filters = useSubscriptionFilters();
  const data = useSubscriptionData(filters.categoryFilter, filters.q);
  const form = useSubscriptionForm(data.categories, data.reload);
  const actions = useSubscriptionActions(data.reload);
  const manage = useSubscriptionManage(data.reload);
  const rateChange = useRateChangeForm({
    detail: manage.detail,
    busy: manage.busy,
    setBusy: manage.setBusy,
    setManageError: manage.setManageError,
    refreshManage: manage.refreshManage,
  });
  const override = useChargeOverride({
    detail: manage.detail,
    busy: manage.busy,
    setBusy: manage.setBusy,
    setManageError: manage.setManageError,
    refreshManage: manage.refreshManage,
  });

  const categorySelectOptions: SelectOption[] = data.categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  function openManage(id: string) {
    manage.setManageError(null);
    rateChange.setShowRcForm(false);
    override.setAdjusting(null);
    rateChange.resetRcForm();
    manage.openManage(id);
  }

  return (
    <Box>
      <PageHeader
        title="Subscriptions"
        subtitle="Recurring tools & services — auto-charged monthly"
      />

      <SubscriptionFilters
        activeMonthly={data.activeMonthly}
        categoryFilter={filters.categoryFilter}
        categoryOptions={categorySelectOptions}
        onCategoryChange={(ids) =>
          filters.setParams({ category: ids.length ? ids.join(",") : undefined })
        }
        searchInput={filters.searchInput}
        onSearchChange={filters.setSearchInput}
        hasActiveFilters={filters.hasActiveFilters}
        onClearFilters={() => filters.setParams({ category: undefined, q: undefined })}
        onAdd={form.openAdd}
      />

      <SubscriptionTable
        loading={data.loading}
        subs={data.subs}
        hasActiveFilters={filters.hasActiveFilters}
        onManage={openManage}
        onEdit={form.openEdit}
        onStop={actions.askStop}
        onResume={actions.resume}
        onDelete={actions.askDelete}
        onCategoryClick={(categoryId) => filters.setParams({ category: categoryId })}
      />

      <SubscriptionFormDrawer
        open={form.drawerOpen}
        editing={form.editing}
        form={form.form}
        onFormChange={form.setForm}
        categories={data.categories}
        saving={form.saving}
        error={form.error}
        onSave={form.save}
        onClose={form.closeDrawer}
      />

      <ManageDrawer
        detail={manage.detail}
        onClose={manage.closeManage}
        manageError={manage.manageError}
        onDismissError={() => manage.setManageError(null)}
        rcForm={rateChange.rcForm}
        onRcFormChange={rateChange.setRcForm}
        showRcForm={rateChange.showRcForm}
        onToggleRcForm={() => rateChange.setShowRcForm((v) => !v)}
        busy={manage.busy}
        onAddRateChange={rateChange.addRateChange}
        onDeleteRateChange={rateChange.deleteRateChange}
        adjusting={override.adjusting}
        onAdjustingChange={override.setAdjusting}
        onStartAdjust={override.startAdjust}
        onSaveOverride={override.saveOverride}
        onClearOverride={override.clearOverride}
        onCancelAdjust={() => override.setAdjusting(null)}
      />

      <ConfirmDialog
        open={!!actions.confirm.dialog}
        title={actions.confirm.dialog?.title ?? ""}
        message={actions.confirm.dialog?.message ?? ""}
        confirmLabel={actions.confirm.dialog?.confirmLabel}
        confirmColor={actions.confirm.dialog?.confirmColor}
        loading={actions.confirm.loading}
        error={actions.confirm.error}
        onConfirm={actions.confirm.runConfirm}
        onClose={actions.confirm.closeConfirm}
      />
    </Box>
  );
}
