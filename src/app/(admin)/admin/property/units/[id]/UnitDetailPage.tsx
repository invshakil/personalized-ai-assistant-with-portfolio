"use client";

import { useRouter } from "next/navigation";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useUnitDetail } from "./hooks/useUnitDetail";
import { useAddFutureTenant } from "./hooks/useAddFutureTenant";
import { useTenantStatusActions } from "./hooks/useTenantStatusActions";
import UnitInfoCard from "./components/UnitInfoCard";
import CurrentTenantCard from "./components/CurrentTenantCard";
import FutureTenantCard from "./components/FutureTenantCard";
import TenancyHistoryTable from "./components/TenancyHistoryTable";
import AddFutureTenantDialog from "./components/AddFutureTenantDialog";
import { fmt } from "./types";

export default function UnitDetailPage({ unitId }: { unitId: string }) {
  const router = useRouter();
  const unitDetail = useUnitDetail(unitId);
  const addFuture = useAddFutureTenant(unitId, unitDetail.unit, unitDetail.reload);
  const statusActions = useTenantStatusActions(unitDetail.unit, unitDetail.reload);

  if (unitDetail.loading || !unitDetail.unit) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 12 }}>
        <CircularProgress />
      </Box>
    );
  }

  const unit = unitDetail.unit;
  const currentTenant =
    unit.tenants.find((t) => t.tenantStatus === "CURRENT" && t.isActive) ?? null;
  const futureTenant = unit.tenants.find((t) => t.tenantStatus === "FUTURE" && t.isActive) ?? null;
  const pastTenants = unit.tenants.filter((t) => t.tenantStatus === "PAST" || !t.isActive);

  return (
    <Box>
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => router.push("/admin/property")}
        sx={{ mb: 2, color: "text.secondary" }}
        size="small"
      >
        Property Management
      </Button>

      <PageHeader
        title={unit.unitNumber}
        subtitle={`${unit.floor} · ${fmt(unit.monthlyRent)}/month`}
      />

      <UnitInfoCard
        unit={unit}
        editMode={unitDetail.editMode}
        onEditModeChange={unitDetail.setEditMode}
        editForm={unitDetail.editForm}
        onEditFormChange={unitDetail.setEditForm}
        saving={unitDetail.saving}
        onSave={unitDetail.saveUnit}
      />

      <Box
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}
      >
        <CurrentTenantCard
          currentTenant={currentTenant}
          futureTenant={futureTenant}
          onMoveOut={statusActions.moveOut}
          onAddTenant={addFuture.openAddFuture}
        />
        <FutureTenantCard
          unit={unit}
          currentTenant={currentTenant}
          futureTenant={futureTenant}
          onPromote={statusActions.promoteNow}
          onAdd={addFuture.openAddFuture}
        />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, fontSize: "1rem" }}>
        Tenancy History
        {pastTenants.length > 0 && (
          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            {pastTenants.length} past tenant{pastTenants.length !== 1 ? "s" : ""}
          </Typography>
        )}
      </Typography>

      <TenancyHistoryTable tenants={pastTenants} />

      <AddFutureTenantDialog
        open={addFuture.addFutureOpen}
        onClose={() => addFuture.setAddFutureOpen(false)}
        unit={unit}
        currentTenant={currentTenant}
        form={addFuture.addFutureForm}
        onFormChange={addFuture.setAddFutureForm}
        accounts={addFuture.accounts}
        advanceAccountId={addFuture.advanceAccountId}
        onAdvanceAccountChange={addFuture.setAdvanceAccountId}
        saving={addFuture.saving}
        onSave={addFuture.addFutureTenant}
      />

      <ConfirmDialog
        open={!!statusActions.dialog}
        title={statusActions.dialog?.title ?? ""}
        message={statusActions.dialog?.message ?? ""}
        confirmLabel={statusActions.dialog?.confirmLabel}
        confirmColor={statusActions.dialog?.confirmColor}
        loading={statusActions.loading}
        onConfirm={statusActions.runConfirm}
        onClose={statusActions.closeConfirm}
      />
    </Box>
  );
}
