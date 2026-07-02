import { Box, Card, CardContent, Typography } from "@mui/material";
import type { ServiceEntry } from "../types";
import ServiceAccordionItem from "./ServiceAccordionItem";

interface ServiceAccordionListProps {
  services: ServiceEntry[];
  onEdit: (s: ServiceEntry) => void;
  onDeactivate: (id: string) => void;
  onEndAssignment: (tenantServiceId: string) => void;
}

export default function ServiceAccordionList({
  services,
  onEdit,
  onDeactivate,
  onEndAssignment,
}: ServiceAccordionListProps) {
  if (services.length === 0) {
    return (
      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent sx={{ textAlign: "center", py: 6 }}>
          <Typography color="text.secondary">
            No services defined yet. Add your first service.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {services.map((s) => (
        <ServiceAccordionItem
          key={s.id}
          service={s}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onEndAssignment={onEndAssignment}
        />
      ))}
    </Box>
  );
}
