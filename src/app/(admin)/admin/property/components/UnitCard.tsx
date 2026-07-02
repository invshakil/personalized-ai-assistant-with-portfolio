import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import type { UnitWithTenant } from "@/types";
import { fmt } from "../types";
import StatusChip from "./StatusChip";

interface UnitCardProps {
  unit: UnitWithTenant;
  onClick: () => void;
}

export default function UnitCard({ unit, onClick }: UnitCardProps) {
  return (
    <Card
      sx={{
        cursor: "pointer",
        borderLeft: "4px solid",
        borderColor: unit.isOccupied ? "success.main" : "warning.main",
        bgcolor: "background.paper",
        "&:hover": { bgcolor: "action.hover" },
        transition: "background-color 0.15s",
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: "14px !important" }}>
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {unit.unitNumber}
          </Typography>
          <StatusChip isOccupied={unit.isOccupied} />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
          {unit.floor}
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          {unit.tenant ? (
            <>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {unit.tenant.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {unit.tenant.tenantCode} · {fmt(unit.monthlyRent)}/mo
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              {fmt(unit.monthlyRent)}/mo
            </Typography>
          )}
          {unit.futureTenant && (
            <Chip
              label={`Future: ${unit.futureTenant.name}${unit.futureTenant.scheduledRent ? ` · ${fmt(unit.futureTenant.scheduledRent)}` : ""}`}
              size="small"
              sx={{
                mt: 0.75,
                fontSize: "0.6rem",
                height: 18,
                bgcolor: "warning.main",
                color: "#fff",
                maxWidth: "100%",
              }}
            />
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
