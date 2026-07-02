import { Divider } from "@mui/material";
import TenantDocuments from "@/components/admin/TenantDocuments";
import type { UnitWithTenant } from "@/types";
import type { RentChangeForm } from "../types";
import TenantServicesSection from "./TenantServicesSection";
import RentChangeSection from "./RentChangeSection";

interface TenantEditExtrasProps {
  tenant: NonNullable<UnitWithTenant["tenant"]>;
  monthlyRent: number;
  serviceCatalog: { id: string; name: string }[];
  addSvcId: string;
  onSvcIdChange: (id: string) => void;
  addSvcFee: string;
  onSvcFeeChange: (fee: string) => void;
  addSvcDate: string;
  onSvcDateChange: (date: string) => void;
  svcSaving: boolean;
  onAssignService: () => void;
  onRemoveService: (tenantServiceId: string) => void;
  showRcForm: boolean;
  onShowRcForm: () => void;
  rcForm: RentChangeForm;
  onRcFormChange: (form: RentChangeForm) => void;
  rcSaving: boolean;
  onCancelRc: () => void;
  onSaveRc: () => void;
}

export default function TenantEditExtras({
  tenant,
  monthlyRent,
  serviceCatalog,
  addSvcId,
  onSvcIdChange,
  addSvcFee,
  onSvcFeeChange,
  addSvcDate,
  onSvcDateChange,
  svcSaving,
  onAssignService,
  onRemoveService,
  showRcForm,
  onShowRcForm,
  rcForm,
  onRcFormChange,
  rcSaving,
  onCancelRc,
  onSaveRc,
}: TenantEditExtrasProps) {
  return (
    <>
      <TenantServicesSection
        tenant={tenant}
        serviceCatalog={serviceCatalog}
        addSvcId={addSvcId}
        onSvcIdChange={onSvcIdChange}
        addSvcFee={addSvcFee}
        onSvcFeeChange={onSvcFeeChange}
        addSvcDate={addSvcDate}
        onSvcDateChange={onSvcDateChange}
        saving={svcSaving}
        onAssign={onAssignService}
        onRemove={onRemoveService}
      />

      <Divider sx={{ my: 2.5 }} />
      <TenantDocuments tenantId={tenant.id} compact />

      {tenant.isActive && (
        <RentChangeSection
          currentRent={monthlyRent}
          showForm={showRcForm}
          onShowForm={onShowRcForm}
          form={rcForm}
          onFormChange={onRcFormChange}
          saving={rcSaving}
          onCancel={onCancelRc}
          onSave={onSaveRc}
        />
      )}
    </>
  );
}
