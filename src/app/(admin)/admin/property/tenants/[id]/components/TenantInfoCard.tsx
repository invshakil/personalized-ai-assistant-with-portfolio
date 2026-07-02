import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { Calendar, Home, Phone } from "lucide-react";
import type { TenantWithUnit } from "@/types";

interface TenantInfoCardProps {
  tenant: TenantWithUnit;
}

export default function TenantInfoCard({ tenant }: TenantInfoCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
          Tenant Info
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {tenant.phone && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Phone size={15} />
              <Typography variant="body2">{tenant.phone}</Typography>
            </Box>
          )}
          {tenant.unit && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Home size={15} />
              <Typography variant="body2">
                {tenant.unit.unitNumber} · {tenant.unit.floor}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Calendar size={15} />
            <Typography variant="body2">
              Move-in: {new Date(tenant.moveInDate).toLocaleDateString()}
            </Typography>
          </Box>
          {tenant.leaseEndDate && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Calendar size={15} />
              <Typography variant="body2">
                Lease end: {new Date(tenant.leaseEndDate).toLocaleDateString()}
              </Typography>
            </Box>
          )}
          {tenant.notes && (
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
              {tenant.notes}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
            <Chip
              label={tenant.isActive ? "Active" : "Inactive"}
              size="small"
              sx={{
                bgcolor: tenant.isActive ? "success.main" : "error.main",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.6875rem",
              }}
            />
            {tenant.isExternal && <Chip label="External Member" size="small" variant="outlined" />}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
