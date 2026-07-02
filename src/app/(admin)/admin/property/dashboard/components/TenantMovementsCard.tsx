import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import { LogIn, LogOut } from "lucide-react";
import EntityLink from "@/components/admin/EntityLink";
import type { PropertyDashboardStats } from "@/types";

interface TenantMovementsCardProps {
  movements: PropertyDashboardStats["tenantMovements"];
}

export default function TenantMovementsCard({ movements }: TenantMovementsCardProps) {
  if (movements.length === 0) return null;

  return (
    <Card sx={{ bgcolor: "background.paper", flex: "1 1 360px", minWidth: 0 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 1.5 }}>
          Tenant Movements
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {movements.map((mv) => {
            const isIn = mv.kind === "MOVE_IN";
            const color = isIn ? "success.main" : "warning.main";
            const verb = isIn
              ? mv.timing === "upcoming"
                ? "moving in"
                : "moved in"
              : mv.timing === "upcoming"
                ? "moving out"
                : "moved out";
            return (
              <Box
                key={`${mv.kind}-${mv.tenantId}`}
                sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
              >
                <Box sx={{ color, display: "flex" }}>
                  {isIn ? <LogIn size={16} /> : <LogOut size={16} />}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}>
                  <EntityLink href={`/admin/property/tenants/${mv.tenantId}`} inline>
                    {mv.tenantName}
                  </EntityLink>
                  {mv.unitNumber ? ` · ${mv.unitNumber}` : ""}
                </Typography>
                {isIn && mv.isNew && (
                  <Chip
                    label="New"
                    size="small"
                    sx={{
                      bgcolor: "primary.main",
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: "0.625rem",
                      height: 18,
                    }}
                  />
                )}
                <Typography variant="caption" sx={{ color }}>
                  {verb}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(mv.date).toLocaleDateString()}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}
