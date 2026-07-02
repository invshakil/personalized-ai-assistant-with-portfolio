"use client";

import { Box, Button, CircularProgress } from "@mui/material";
import { Plus } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { useServiceCatalog } from "./hooks/useServiceCatalog";
import { useServiceAssignment } from "./hooks/useServiceAssignment";
import ServiceRevenueCard from "./components/ServiceRevenueCard";
import ServiceAccordionList from "./components/ServiceAccordionList";
import ServiceDrawer from "./components/ServiceDrawer";
import AssignServiceDrawer from "./components/AssignServiceDrawer";

export default function ServicesPage() {
  const catalog = useServiceCatalog();
  const assignment = useServiceAssignment(catalog.reload);

  return (
    <Box>
      <PageHeader
        title="Add-On Services"
        subtitle="Manage service catalog and tenant subscriptions"
      />

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={catalog.openAdd}>
          Add Service
        </Button>
        <Button variant="outlined" startIcon={<Plus size={16} />} onClick={assignment.openDrawer}>
          Assign to Tenant
        </Button>
      </Box>

      {catalog.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {catalog.services.length > 0 && <ServiceRevenueCard services={catalog.services} />}
          <ServiceAccordionList
            services={catalog.services}
            onEdit={catalog.openEdit}
            onDeactivate={catalog.deactivate}
            onEndAssignment={assignment.endAssignment}
          />
        </Box>
      )}

      <ServiceDrawer
        open={catalog.drawerOpen}
        editing={!!catalog.editingService}
        name={catalog.name}
        onNameChange={catalog.setName}
        description={catalog.description}
        onDescriptionChange={catalog.setDescription}
        saving={catalog.saving}
        error={catalog.error}
        onSave={catalog.save}
        onClose={catalog.closeDrawer}
      />

      <AssignServiceDrawer
        open={assignment.drawerOpen}
        services={catalog.services}
        tenants={catalog.tenants}
        tenantId={assignment.tenantId}
        onTenantChange={assignment.setTenantId}
        serviceId={assignment.serviceId}
        onServiceChange={assignment.setServiceId}
        fee={assignment.fee}
        onFeeChange={assignment.setFee}
        date={assignment.date}
        onDateChange={assignment.setDate}
        saving={assignment.saving}
        error={assignment.error}
        onSave={assignment.save}
        onClose={assignment.closeDrawer}
      />
    </Box>
  );
}
