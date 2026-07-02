import { Box, Card, CardContent, Chip, Typography } from "@mui/material";
import type { TenantWithUnit } from "@/types";
import { fmt } from "../utils";

interface AdvanceRentCardProps {
  tenant: TenantWithUnit;
}

export default function AdvanceRentCard({ tenant }: AdvanceRentCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
          Advance Rent
        </Typography>
        {tenant.advancePaid ? (
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main", mb: 0.5 }}>
              {fmt(tenant.advanceAmount ? Number(tenant.advanceAmount) : 0)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Available advance balance
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip
                label={tenant.advanceSettled ? "Settled" : "Held"}
                size="small"
                sx={{
                  bgcolor: tenant.advanceSettled ? "text.disabled" : "primary.main",
                  color: "#fff",
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No advance on record
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
