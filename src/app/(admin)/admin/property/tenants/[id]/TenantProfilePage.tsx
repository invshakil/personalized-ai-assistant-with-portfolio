"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Box, Button, Card, CardContent, CircularProgress, Typography } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import TenantDocuments from "@/components/admin/TenantDocuments";
import { useTenantDetail } from "./hooks/useTenantDetail";
import { usePaymentHistory } from "./hooks/usePaymentHistory";
import { useRentChangeEdit } from "./hooks/useRentChangeEdit";
import TenantInfoCard from "./components/TenantInfoCard";
import AdvanceRentCard from "./components/AdvanceRentCard";
import ActiveServicesSection from "./components/ActiveServicesSection";
import PendingRentChangesSection from "./components/PendingRentChangesSection";
import PaymentHistoryTable from "./components/PaymentHistoryTable";
import { useServiceCatalog } from "../../hooks/useServiceCatalog";
import { useUnitsData } from "../../hooks/useUnitsData";
import { useMoveTenantDialog } from "../../hooks/useMoveTenantDialog";
import MoveTenantDialog from "../../components/MoveTenantDialog";

export default function TenantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { tenant, loading, reload } = useTenantDetail(id);
  const paymentHistory = usePaymentHistory(reload);
  const rentChangeEdit = useRentChangeEdit(reload);
  const serviceCatalog = useServiceCatalog();
  const unitsData = useUnitsData();
  const moveTenant = useMoveTenantDialog(unitsData.units, async () => {
    await reload();
    await unitsData.reload();
  });

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tenant) {
    return <Typography color="error">Tenant not found.</Typography>;
  }

  const pendingChanges = tenant.rentChanges.filter((rc) => !rc.appliedAt);
  const canMove = tenant.isActive && tenant.tenantStatus === "CURRENT" && !!tenant.unit;

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Button
          component={Link}
          href="/admin/property"
          startIcon={<ArrowLeft size={16} />}
          size="small"
          sx={{ color: "text.secondary" }}
        >
          Back to Property
        </Button>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <PageHeader
          title={tenant.name}
          subtitle={`${tenant.tenantCode ?? ""} · ${tenant.unit?.unitNumber ?? "External Member"}`}
        />
        {canMove && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowLeftRight size={14} />}
            onClick={() =>
              moveTenant.openMoveTenantDialog(
                tenant.id,
                tenant.name,
                tenant.unit!.id,
                tenant.services.filter((s) => s.isActive)
              )
            }
          >
            Move to another unit
          </Button>
        )}
      </Box>

      <Box
        sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mb: 3 }}
      >
        <TenantInfoCard tenant={tenant} />
        <AdvanceRentCard tenant={tenant} />
      </Box>

      <ActiveServicesSection services={tenant.services} />

      <PendingRentChangesSection
        changes={pendingChanges}
        editRcId={rentChangeEdit.editRcId}
        editRcDate={rentChangeEdit.editRcDate}
        onEditRcDateChange={rentChangeEdit.setEditRcDate}
        editRcRent={rentChangeEdit.editRcRent}
        onEditRcRentChange={rentChangeEdit.setEditRcRent}
        editRcReason={rentChangeEdit.editRcReason}
        onEditRcReasonChange={rentChangeEdit.setEditRcReason}
        rcSaving={rentChangeEdit.rcSaving}
        onOpenEdit={rentChangeEdit.openEditRc}
        onCancelEdit={rentChangeEdit.closeEditRc}
        onSaveEdit={rentChangeEdit.saveEditRc}
        onDelete={rentChangeEdit.deleteRc}
      />

      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent>
          <TenantDocuments tenantId={tenant.id} />
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Payment History
            </Typography>
            <Button
              component={Link}
              href="/admin/property/payments"
              size="small"
              variant="outlined"
            >
              Go to Payments
            </Button>
          </Box>

          <PaymentHistoryTable
            payments={tenant.payments ?? []}
            moveInDate={tenant.moveInDate}
            expandedPayments={paymentHistory.expandedPayments}
            onToggle={paymentHistory.togglePayment}
            onDelete={(pid, e) => {
              e.stopPropagation();
              paymentHistory.deletePayment(pid);
            }}
            deletingPaymentId={paymentHistory.deletingPaymentId}
          />
        </CardContent>
      </Card>

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
    </Box>
  );
}
