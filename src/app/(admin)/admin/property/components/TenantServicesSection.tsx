import { Divider, Typography } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import CurrentServicesList from "./CurrentServicesList";
import AssignServiceForm from "./AssignServiceForm";

interface TenantServicesSectionProps {
  tenant: NonNullable<UnitWithTenant["tenant"]>;
  serviceCatalog: { id: string; name: string }[];
  addSvcId: string;
  onSvcIdChange: (id: string) => void;
  addSvcFee: string;
  onSvcFeeChange: (fee: string) => void;
  addSvcDate: string;
  onSvcDateChange: (date: string) => void;
  saving: boolean;
  onAssign: () => void;
  onRemove: (tenantServiceId: string) => void;
}

export default function TenantServicesSection({
  tenant,
  serviceCatalog,
  addSvcId,
  onSvcIdChange,
  addSvcFee,
  onSvcFeeChange,
  addSvcDate,
  onSvcDateChange,
  saving,
  onAssign,
  onRemove,
}: TenantServicesSectionProps) {
  const availableServices = serviceCatalog.filter(
    (c) => !tenant.services?.some((sv) => sv.serviceName === c.name)
  );

  return (
    <>
      <Divider sx={{ my: 2.5 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        Add-On Services
      </Typography>

      <CurrentServicesList services={tenant.services} onRemove={onRemove} />

      <AssignServiceForm
        availableServices={availableServices}
        addSvcId={addSvcId}
        onSvcIdChange={onSvcIdChange}
        addSvcFee={addSvcFee}
        onSvcFeeChange={onSvcFeeChange}
        addSvcDate={addSvcDate}
        onSvcDateChange={onSvcDateChange}
        saving={saving}
        onAssign={onAssign}
      />
    </>
  );
}
