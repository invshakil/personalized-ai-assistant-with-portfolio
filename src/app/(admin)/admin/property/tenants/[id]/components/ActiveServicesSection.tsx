import { Box, Card, CardContent, Typography } from "@mui/material";
import { Wifi } from "lucide-react";
import type { TenantWithUnit } from "@/types";
import { fmt } from "../utils";

interface ActiveServicesSectionProps {
  services: TenantWithUnit["services"];
}

export default function ActiveServicesSection({ services }: ActiveServicesSectionProps) {
  const activeServices = services.filter((s) => s.isActive);
  if (activeServices.length === 0) return null;
  const serviceTotal = activeServices.reduce((sum, s) => sum + s.monthlyFee, 0);

  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Wifi size={16} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Active Services
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          {activeServices.map((s) => (
            <Box
              key={s.id}
              sx={{
                px: 1.5,
                py: 0.75,
                bgcolor: "action.selected",
                borderRadius: 1,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {s.serviceName}
              </Typography>
              <Typography variant="caption" color="primary.main">
                {fmt(s.monthlyFee)}/mo
              </Typography>
            </Box>
          ))}
          <Box sx={{ px: 1.5, py: 0.75, bgcolor: "primary.main", borderRadius: 1, ml: "auto" }}>
            <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600 }}>
              Services total: {fmt(serviceTotal)}/mo
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
