import { Avatar, Box, Button, Card, CardContent, Chip, Divider, Typography } from "@mui/material";
import { Pencil } from "lucide-react";
import type { Payee } from "@/types";
import { initials } from "../utils";

interface PayeeInfoCardProps {
  payee: Payee;
  onEdit: () => void;
}

export default function PayeeInfoCard({ payee, onEdit }: PayeeInfoCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: "primary.main", width: 56, height: 56, fontSize: "1.25rem" }}>
            {initials(payee.name)}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {payee.name}
              </Typography>
              <Chip
                label={payee.isActive ? "Active" : "Inactive"}
                size="small"
                sx={{
                  bgcolor: payee.isActive ? "success.main" : "text.disabled",
                  color: "#fff",
                  fontSize: "0.65rem",
                }}
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {payee.role}
            </Typography>
          </Box>
          <Button size="small" startIcon={<Pencil size={14} />} onClick={onEdit}>
            Edit
          </Button>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
          {[
            ["Phone", payee.phone],
            ["Email", payee.email],
            ["Address", payee.address],
            ["NID Number", payee.nidNumber],
          ].map(([label, val]) =>
            val ? (
              <Box key={label as string}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Typography variant="body2">{val}</Typography>
              </Box>
            ) : null
          )}
          {payee.notes && (
            <Box sx={{ gridColumn: "1 / -1" }}>
              <Typography variant="caption" color="text.secondary">
                Notes
              </Typography>
              <Typography variant="body2">{payee.notes}</Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
