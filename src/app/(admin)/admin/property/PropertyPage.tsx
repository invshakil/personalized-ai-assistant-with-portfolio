"use client";

import { Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { UnitWithTenant } from "@/types";
import { useUnitsData } from "./hooks/useUnitsData";
import { usePropertyTabs } from "./hooks/usePropertyTabs";
import { useInactiveTenants } from "./hooks/useInactiveTenants";
import { useTenantSearch } from "./hooks/useTenantSearch";
import { useServiceCatalog } from "./hooks/useServiceCatalog";
import { useTenantFiltering } from "./hooks/useTenantFiltering";
import { useMoneyAccounts } from "./hooks/useMoneyAccounts";
import { useTenantEditor } from "./hooks/useTenantEditor";
import { useRentChangeForm } from "./hooks/useRentChangeForm";
import { useTenantServices } from "./hooks/useTenantServices";
import { useAddTenantForm } from "./hooks/useAddTenantForm";
import { useAssignUnitDialog } from "./hooks/useAssignUnitDialog";
import { useMoveTenantDialog } from "./hooks/useMoveTenantDialog";
import { useTenantActivation } from "./hooks/useTenantActivation";
import StatsRow from "./components/StatsRow";
import PropertyTabsHeader from "./components/PropertyTabsHeader";
import UnitGrid from "./components/UnitGrid";
import TenantsTabContent from "./components/TenantsTabContent";
import ExternalTabContent from "./components/ExternalTabContent";
import TenantEditDrawer from "./components/TenantEditDrawer";
import AddTenantDrawer from "./components/AddTenantDrawer";
import AssignUnitDialog from "./components/AssignUnitDialog";
import MoveTenantDialog from "./components/MoveTenantDialog";
import PropertyConfirmDialog from "./components/PropertyConfirmDialog";

export default function PropertyPage() {
  const confirm = useConfirmDialog();
  const unitsData = useUnitsData();
  const tabs = usePropertyTabs();
  const inactive = useInactiveTenants(
    tabs.tenantQuery,
    tabs.tenantView === "past" || tabs.extView === "past"
  );
  const tenantSearch = useTenantSearch(tabs.tenantQuery, tabs.setParams);
  const serviceCatalog = useServiceCatalog();
  const filtering = useTenantFiltering(
    unitsData.units,
    unitsData.unassignedRows,
    tabs.tenantUnitFilter,
    tabs.tenantStateFilter,
    tabs.tenantQuery
  );
  const accounts = useMoneyAccounts();

  const tenantEditor = useTenantEditor(unitsData.setUnits, unitsData.reload);
  const rentChange = useRentChangeForm();
  const tenantServices = useTenantServices(
    tenantEditor.editTenantRow,
    tenantEditor.refreshEditRow,
    confirm.openConfirm
  );
  const addTenantForm = useAddTenantForm(unitsData.units, accounts, unitsData.reload);
  const assignUnit = useAssignUnitDialog(unitsData.units, unitsData.reload);
  const moveTenant = useMoveTenantDialog(unitsData.units, unitsData.reload);
  const activation = useTenantActivation(
    confirm.openConfirm,
    unitsData.reload,
    inactive.loadInactive
  );

  function openTenantEdit(row: UnitWithTenant) {
    tenantEditor.openTenantEdit(row);
    tenantServices.resetForm();
    rentChange.resetFor(row.monthlyRent);
  }

  const activeTenantRows = [
    ...unitsData.units.filter((u) => u.tenant && !u.tenant.isExternal && u.tenant.isActive),
    ...unitsData.unassignedRows.filter((r) => !r.tenant?.isExternal),
    // Future tenants — show as separate rows in the same unit column
    ...unitsData.units
      .filter((u) => u.futureTenant && !u.futureTenant.isExternal)
      .map((u) => ({ ...u, tenant: u.futureTenant! })),
  ].filter(filtering.tenantMatches);

  const externalActiveRows = [
    ...unitsData.units.filter((u) => u.tenant?.isExternal && u.tenant.isActive),
    ...unitsData.unassignedRows.filter((r) => r.tenant?.isExternal),
  ];

  return (
    <Box>
      <PageHeader title="Property Management" subtitle="Manage units, tenants, and occupancy" />

      <StatsRow
        totalUnits={unitsData.units.length}
        occupiedCount={unitsData.units.filter((u) => u.isOccupied).length}
        vacantCount={unitsData.units.filter((u) => !u.isOccupied).length}
        activeTenantsCount={filtering.activeTenants.length}
      />

      <PropertyTabsHeader
        tab={tabs.tab}
        onTabChange={tabs.setTab}
        unitsCount={unitsData.units.length}
        activeTenantsCount={filtering.activeTenants.length}
        externalTenantsCount={filtering.externalTenants.length}
        onAddTenant={() => addTenantForm.openAddTenant()}
        onAddExternal={addTenantForm.openAddExternal}
      />

      {unitsData.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ mt: 3 }}>
          {tabs.tab === 0 && <UnitGrid units={unitsData.units} />}

          {tabs.tab === 1 && (
            <TenantsTabContent
              view={tabs.tenantView}
              onViewChange={(v) => {
                tabs.setTenantView(v);
                if (v === "past") inactive.loadInactive();
              }}
              activeRows={activeTenantRows}
              inactiveRows={inactive.inactiveRows.filter((r) => !r.tenant?.isExternal)}
              inactiveLoading={inactive.inactiveLoading}
              unitFilter={tabs.tenantUnitFilter}
              unitOptions={filtering.tenantUnitOptions}
              stateFilter={tabs.tenantStateFilter}
              stateOptions={filtering.tenantStateOptions}
              searchInput={tenantSearch.tenantSearchInput}
              onSearchChange={tenantSearch.setTenantSearchInput}
              hasActiveFilters={tabs.hasTenantFilters}
              setParams={tabs.setParams}
              onEdit={openTenantEdit}
              onDeactivate={activation.deactivateTenant}
              onActivate={activation.activateTenant}
              onAssignUnit={(id, name, moveInDate) =>
                assignUnit.openAssignUnitDialog(id, name, moveInDate)
              }
              onMoveTenant={(id, name, currentUnitId, services) =>
                moveTenant.openMoveTenantDialog(id, name, currentUnitId, services)
              }
            />
          )}

          {tabs.tab === 2 && (
            <ExternalTabContent
              view={tabs.extView}
              onViewChange={(v) => {
                tabs.setExtView(v);
                if (v === "past") inactive.loadInactive();
              }}
              activeRows={externalActiveRows}
              inactiveRows={inactive.inactiveRows.filter((r) => r.tenant?.isExternal)}
              inactiveLoading={inactive.inactiveLoading}
              onEdit={openTenantEdit}
              onDeactivate={activation.deactivateTenant}
              onActivate={activation.activateTenant}
            />
          )}
        </Box>
      )}

      <TenantEditDrawer
        row={tenantEditor.editTenantRow}
        onClose={tenantEditor.closeTenantEdit}
        form={tenantEditor.tenantForm}
        onFormChange={tenantEditor.setTenantForm}
        saving={tenantEditor.saving}
        onSave={tenantEditor.saveTenant}
        serviceCatalog={serviceCatalog}
        addSvcId={tenantServices.addSvcId}
        onSvcIdChange={tenantServices.setAddSvcId}
        addSvcFee={tenantServices.addSvcFee}
        onSvcFeeChange={tenantServices.setAddSvcFee}
        addSvcDate={tenantServices.addSvcDate}
        onSvcDateChange={tenantServices.setAddSvcDate}
        svcSaving={tenantServices.saving}
        onAssignService={tenantServices.assignService}
        onRemoveService={(tenantServiceId) =>
          tenantServices.removeService(tenantServiceId, tenantEditor.editTenantRow!.tenant!.id)
        }
        showRcForm={rentChange.showRcForm}
        onShowRcForm={() => rentChange.setShowRcForm(true)}
        rcForm={rentChange.rcForm}
        onRcFormChange={rentChange.setRcForm}
        rcSaving={rentChange.saving}
        onCancelRc={() => rentChange.setShowRcForm(false)}
        onSaveRc={() => rentChange.saveRentChange(tenantEditor.editTenantRow)}
      />

      <AddTenantDrawer
        open={addTenantForm.addOpen}
        onClose={() => addTenantForm.setAddOpen(false)}
        isAddingExternal={addTenantForm.isAddingExternal}
        form={addTenantForm.addForm}
        onFormChange={addTenantForm.setAddForm}
        unitsWithoutFuture={filtering.unitsWithoutFuture}
        selectedUnit={addTenantForm.selectedUnit}
        accounts={accounts}
        advanceAccountId={addTenantForm.advanceAccountId}
        onAdvanceAccountChange={addTenantForm.setAdvanceAccountId}
        fileInputRef={addTenantForm.addFileInputRef}
        pendingFiles={addTenantForm.pendingFiles}
        onAddFiles={addTenantForm.addPendingFiles}
        onRemoveFile={addTenantForm.removePendingFile}
        saving={addTenantForm.saving}
        onSave={addTenantForm.saveNewTenant}
      />

      <AssignUnitDialog
        dialog={assignUnit.assignUnitDialog}
        onClose={assignUnit.closeAssignUnitDialog}
        units={unitsData.units}
        assigningUnitId={assignUnit.assigningUnitId}
        onSelectUnit={assignUnit.selectAssigningUnit}
        assignRent={assignUnit.assignRent}
        onAssignRentChange={assignUnit.setAssignRent}
        assignOutgoingMoveOut={assignUnit.assignOutgoingMoveOut}
        onAssignOutgoingMoveOutChange={assignUnit.setAssignOutgoingMoveOut}
        saving={assignUnit.assignSaving}
        onAssign={assignUnit.doAssignUnit}
      />

      <MoveTenantDialog
        dialog={moveTenant.moveTenantDialog}
        onClose={moveTenant.closeMoveTenantDialog}
        units={unitsData.units}
        serviceCatalog={serviceCatalog}
        targetUnitId={moveTenant.moveTargetUnitId}
        onSelectUnit={moveTenant.selectMoveTargetUnit}
        rent={moveTenant.moveRent}
        onRentChange={moveTenant.setMoveRent}
        moveDate={moveTenant.moveDate}
        onMoveDateChange={moveTenant.setMoveDate}
        endServiceIds={moveTenant.moveEndServiceIds}
        onToggleEndService={moveTenant.toggleMoveEndService}
        addSvcId={moveTenant.moveAddSvcId}
        onAddSvcIdChange={moveTenant.setMoveAddSvcId}
        addSvcFee={moveTenant.moveAddSvcFee}
        onAddSvcFeeChange={moveTenant.setMoveAddSvcFee}
        saving={moveTenant.moveSaving}
        onMove={moveTenant.doMoveTenant}
      />

      <PropertyConfirmDialog
        dialog={confirm.dialog}
        loading={confirm.loading}
        error={confirm.error}
        onConfirm={confirm.runConfirm}
        onClose={confirm.closeConfirm}
      />
    </Box>
  );
}
