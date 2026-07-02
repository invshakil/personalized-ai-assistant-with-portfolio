import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { X } from "lucide-react";
import type { UnitWithTenant } from "@/types";
import { fmt } from "../types";

type TenantServices = NonNullable<UnitWithTenant["tenant"]>["services"];

interface CurrentServicesListProps {
  services: TenantServices;
  onRemove: (tenantServiceId: string) => void;
}

export default function CurrentServicesList({ services, onRemove }: CurrentServicesListProps) {
  if (!services || services.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
        No services assigned.
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1.5 }}>
      {services.map((sv) => (
        <Box
          key={sv.id}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor: "action.selected",
            px: 1.5,
            py: 0.75,
            borderRadius: 1,
          }}
        >
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {sv.serviceName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sv.monthlyFee > 0 ? `${fmt(sv.monthlyFee)}/month` : "Free"}
            </Typography>
          </Box>
          <Tooltip title="Remove service">
            <IconButton size="small" color="error" onClick={() => onRemove(sv.id)}>
              <X size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Box>
  );
}
