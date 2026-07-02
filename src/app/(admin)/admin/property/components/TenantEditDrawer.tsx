import { Box, Drawer } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import type { RentChangeForm, TenantForm } from "../types";
import TenantEditHeader from "./TenantEditHeader";
import TenantEditForm from "./TenantEditForm";
import TenantEditExtras from "./TenantEditExtras";

interface TenantEditDrawerProps {
  row: UnitWithTenant | null;
  onClose: () => void;
  form: TenantForm;
  onFormChange: (form: TenantForm) => void;
  saving: boolean;
  onSave: () => void;
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

export default function TenantEditDrawer({
  row,
  onClose,
  form,
  onFormChange,
  saving,
  onSave,
  ...extras
}: TenantEditDrawerProps) {
  const tenant = row?.tenant;

  return (
    <Drawer
      anchor="right"
      open={!!row}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      {tenant && (
        <Box sx={{ width: "100%", p: 3 }}>
          <TenantEditHeader row={row!} onClose={onClose} />
          <TenantEditForm
            form={form}
            onFormChange={onFormChange}
            saving={saving}
            onCancel={onClose}
            onSave={onSave}
          />
          <TenantEditExtras tenant={tenant} monthlyRent={row!.monthlyRent} {...extras} />
        </Box>
      )}
    </Drawer>
  );
}
