import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { ServiceEntry, TenantOption } from "../types";

interface AssignServiceFieldsProps {
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
}

export default function AssignServiceFields({
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
}: AssignServiceFieldsProps) {
  return (
    <>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Tenant</InputLabel>
        <Select label="Tenant" value={tenantId} onChange={(e) => onTenantChange(e.target.value)}>
          {tenants.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.tenantCode ? `${t.tenantCode} · ` : ""}
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Service</InputLabel>
        <Select label="Service" value={serviceId} onChange={(e) => onServiceChange(e.target.value)}>
          {services
            .filter((s) => s.isActive)
            .map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
      <TextField
        label="Monthly Fee (৳)"
        type="number"
        size="small"
        fullWidth
        value={fee}
        onChange={(e) => onFeeChange(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Start Date"
        type="date"
        size="small"
        fullWidth
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        sx={{ mb: 2 }}
      />
    </>
  );
}
