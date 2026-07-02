import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { Calendar, DollarSign, ExternalLink, Phone, Plus, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import type { TenantHistory, UnitDetail } from "../types";
import { fmt } from "../types";

interface FutureTenantCardProps {
  unit: UnitDetail;
  currentTenant: TenantHistory | null;
  futureTenant: TenantHistory | null;
  onPromote: (current: TenantHistory, future: TenantHistory) => void;
  onAdd: () => void;
}

export default function FutureTenantCard({
  unit,
  currentTenant,
  futureTenant,
  onPromote,
  onAdd,
}: FutureTenantCardProps) {
  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        borderLeft: "4px solid",
        borderColor: futureTenant ? "warning.main" : "divider",
      }}
    >
      <CardContent>
        <Typography
          variant="overline"
          sx={{ color: "warning.main", fontSize: "0.6875rem", fontWeight: 700 }}
        >
          Scheduled Future Tenant
        </Typography>
        {futureTenant ? (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <UserPlus size={18} color="var(--mui-palette-warning-main)" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {futureTenant.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {futureTenant.tenantCode}
                  {futureTenant.scheduledRent
                    ? ` · ${fmt(futureTenant.scheduledRent)}/mo`
                    : ` · ${fmt(unit.monthlyRent)}/mo (unchanged)`}
                </Typography>
              </Box>
            </Box>
            {futureTenant.scheduledRent && futureTenant.scheduledRent !== unit.monthlyRent && (
              <Box
                sx={{
                  bgcolor: "action.selected",
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  mb: 1.5,
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                }}
              >
                <DollarSign size={13} />
                <Typography variant="caption">
                  Rent changes from {fmt(unit.monthlyRent)} →{" "}
                  <strong>{fmt(futureTenant.scheduledRent)}</strong> on their move-in date
                </Typography>
              </Box>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
              {futureTenant.phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Phone size={13} />
                  <Typography variant="body2">{futureTenant.phone}</Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar size={13} />
                <Typography variant="body2">
                  Move-in:{" "}
                  {new Date(futureTenant.moveInDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Typography>
              </Box>
              {futureTenant.leaseEndDate && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar size={13} />
                  <Typography variant="body2">
                    Lease ends:{" "}
                    {new Date(futureTenant.leaseEndDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                component={Link}
                href={`/admin/property/tenants/${futureTenant.id}`}
                variant="outlined"
                size="small"
                startIcon={<ExternalLink size={13} />}
                sx={{ flex: 1 }}
              >
                Profile
              </Button>
              {currentTenant && (
                <Button
                  variant="outlined"
                  color="warning"
                  size="small"
                  startIcon={<UserCheck size={13} />}
                  sx={{ flex: 1 }}
                  onClick={() => onPromote(currentTenant, futureTenant)}
                >
                  Promote Now
                </Button>
              )}
            </Box>
          </Box>
        ) : currentTenant ? (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              No future tenant scheduled.
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={onAdd}
              sx={{ alignSelf: "flex-start" }}
            >
              Schedule Future Tenant
            </Button>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Unit is vacant — add a current tenant first.
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
