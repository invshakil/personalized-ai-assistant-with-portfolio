import { Box, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import type { EmployeeRow } from "../../../types";
import { fmt } from "../../../format";

interface EmployeeInfoCardProps {
  employee: EmployeeRow;
}

export default function EmployeeInfoCard({ employee }: EmployeeInfoCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          {!employee.isActive && <Chip size="small" label="Inactive" variant="outlined" />}
        </Box>
        <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Phone
            </Typography>
            <Typography variant="body2">{employee.phone ?? "—"}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Payments
            </Typography>
            <Typography variant="body2">{employee.paymentCount}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Paid
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.main" }}>
              {fmt(employee.totalPaid)}
            </Typography>
          </Box>
          {employee.notes && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Notes
              </Typography>
              <Typography variant="body2">{employee.notes}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
