import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { ServiceEntry, TenantOption } from "../types";
import AssignServiceFields from "./AssignServiceFields";

interface AssignServiceDrawerProps {
  open: boolean;
  services: ServiceEntry[];
  tenants: TenantOption[];
  tenantId: string;
  onTenantChange: (v: string) => void;
  serviceId: string;
  onServiceChange: (v: string) => void;
  fee: string;
  onFeeChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function AssignServiceDrawer({
  open,
  services,
  tenants,
  tenantId,
  onTenantChange,
  serviceId,
  onServiceChange,
  fee,
  onFeeChange,
  date,
  onDateChange,
  saving,
  error,
  onSave,
  onClose,
}: AssignServiceDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Assign Service to Tenant
        </Typography>
        <AssignServiceFields
          services={services}
          tenants={tenants}
          tenantId={tenantId}
          onTenantChange={onTenantChange}
          serviceId={serviceId}
          onServiceChange={onServiceChange}
          fee={fee}
          onFeeChange={onFeeChange}
          date={date}
          onDateChange={onDateChange}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onSave}
          disabled={saving || !tenantId || !serviceId || fee === "" || parseFloat(fee) < 0}
        >
          {saving ? "Saving…" : "Assign Service"}
        </Button>
      </Box>
    </Drawer>
  );
}
