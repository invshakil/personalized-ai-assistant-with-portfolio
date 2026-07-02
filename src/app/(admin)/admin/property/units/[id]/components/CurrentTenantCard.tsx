import { Box, Button, Card, CardContent, Typography } from "@mui/material";
import { Calendar, DollarSign, ExternalLink, Phone, Plus, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import EntityLink from "@/components/admin/EntityLink";
import type { TenantHistory } from "../types";
import { fmt } from "../types";

interface CurrentTenantCardProps {
  currentTenant: TenantHistory | null;
  futureTenant: TenantHistory | null;
  onMoveOut: (t: TenantHistory) => void;
  onAddTenant: () => void;
}

export default function CurrentTenantCard({
  currentTenant,
  futureTenant,
  onMoveOut,
  onAddTenant,
}: CurrentTenantCardProps) {
  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        borderLeft: "4px solid",
        borderColor: currentTenant ? "success.main" : "divider",
      }}
    >
      <CardContent>
        <Typography
          variant="overline"
          sx={{ color: "success.main", fontSize: "0.6875rem", fontWeight: 700 }}
        >
          Current Tenant
        </Typography>
        {currentTenant ? (
          <Box sx={{ mt: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <UserCheck size={18} color="var(--mui-palette-success-main)" />
              <Box>
                <EntityLink
                  href={`/admin/property/tenants/${currentTenant.id}`}
                  variant="subtitle2"
                  sx={{ fontWeight: 700 }}
                >
                  {currentTenant.name}
                </EntityLink>
                <Typography variant="caption" color="text.secondary">
                  {currentTenant.tenantCode}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
              {currentTenant.phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Phone size={13} />
                  <Typography variant="body2">{currentTenant.phone}</Typography>
                </Box>
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Calendar size={13} />
                <Typography variant="body2">
                  Move-in:{" "}
                  {new Date(currentTenant.moveInDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </Typography>
              </Box>
              {currentTenant.leaseEndDate && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Calendar size={13} />
                  <Typography variant="body2">
                    Lease ends:{" "}
                    {new Date(currentTenant.leaseEndDate).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </Typography>
                </Box>
              )}
              {currentTenant.advancePaid && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DollarSign size={13} />
                  <Typography variant="body2">
                    Advance: {fmt(currentTenant.advanceAmount)}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                component={Link}
                href={`/admin/property/tenants/${currentTenant.id}`}
                variant="outlined"
                size="small"
                startIcon={<ExternalLink size={13} />}
                sx={{ flex: 1 }}
              >
                Profile
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<UserX size={13} />}
                sx={{ flex: 1 }}
                onClick={() => onMoveOut(currentTenant)}
              >
                Move Out{futureTenant ? ` (→ ${futureTenant.name})` : ""}
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              This unit is currently vacant.
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={onAddTenant}
              sx={{ alignSelf: "flex-start" }}
            >
              Add Tenant
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
