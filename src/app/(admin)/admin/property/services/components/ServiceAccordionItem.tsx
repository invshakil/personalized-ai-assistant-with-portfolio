import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { ChevronDown, Pencil, PowerOff } from "lucide-react";
import type { ServiceEntry } from "../types";
import { fmt, serviceRevenue } from "../types";
import ServiceTenantsTable from "./ServiceTenantsTable";

interface ServiceAccordionItemProps {
  service: ServiceEntry;
  onEdit: (s: ServiceEntry) => void;
  onDeactivate: (id: string) => void;
  onEndAssignment: (tenantServiceId: string) => void;
}

export default function ServiceAccordionItem({
  service: s,
  onEdit,
  onDeactivate,
  onEndAssignment,
}: ServiceAccordionItemProps) {
  return (
    <Accordion sx={{ bgcolor: "background.paper" }}>
      <AccordionSummary expandIcon={<ChevronDown size={16} />}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {s.name}
          </Typography>
          {s.description && (
            <Typography variant="caption" color="text.secondary">
              {s.description}
            </Typography>
          )}
          <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
            <Chip
              label={`${fmt(serviceRevenue(s))}/mo`}
              size="small"
              sx={{
                bgcolor: "success.main",
                color: "#fff",
                fontSize: "0.6875rem",
                fontWeight: 700,
              }}
            />
            <Chip
              label={`${s.assignedCount} tenant${s.assignedCount !== 1 ? "s" : ""}`}
              size="small"
              sx={{ bgcolor: "primary.main", color: "#fff", fontSize: "0.6875rem" }}
            />
            <Chip
              label={s.isActive ? "Active" : "Inactive"}
              size="small"
              sx={{
                bgcolor: s.isActive ? "success.main" : "error.main",
                color: "#fff",
                fontSize: "0.6875rem",
              }}
            />
            <Tooltip title="Edit">
              <IconButton
                component="div"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(s);
                }}
              >
                <Pencil size={14} />
              </IconButton>
            </Tooltip>
            {s.isActive && (
              <Tooltip title="Deactivate">
                <IconButton
                  component="div"
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeactivate(s.id);
                  }}
                >
                  <PowerOff size={14} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <ServiceTenantsTable tenants={s.tenants} onEndAssignment={onEndAssignment} />
      </AccordionDetails>
    </Accordion>
  );
}
