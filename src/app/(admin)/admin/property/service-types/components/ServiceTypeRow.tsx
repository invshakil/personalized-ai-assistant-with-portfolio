import { Box, TableCell, TableRow, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { Pencil, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import type { PropertyServiceType } from "@/types";
import { CATEGORY_COLOR } from "../types";

interface ServiceTypeRowProps {
  type: PropertyServiceType;
  onEdit: (t: PropertyServiceType) => void;
  onToggleActive: (t: PropertyServiceType) => void;
  onDelete: (t: PropertyServiceType) => void;
}

export default function ServiceTypeRow({
  type: t,
  onEdit,
  onToggleActive,
  onDelete,
}: ServiceTypeRowProps) {
  return (
    <TableRow hover sx={{ opacity: t.isActive ? 1 : 0.5 }}>
      <TableCell data-label="Name" sx={{ pl: 3 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {t.name}
        </Typography>
      </TableCell>
      <TableCell data-label="Category">
        <Chip
          label={t.category}
          size="small"
          sx={{ bgcolor: CATEGORY_COLOR[t.category], color: "#fff", fontSize: "0.7rem" }}
        />
      </TableCell>
      <TableCell data-label="Description">
        <Typography variant="caption" color="text.secondary">
          {t.description ?? "—"}
        </Typography>
      </TableCell>
      <TableCell data-label="Status">
        <Chip
          label={t.isActive ? "Active" : "Inactive"}
          size="small"
          sx={{
            bgcolor: t.isActive ? "success.main" : "text.disabled",
            color: "#fff",
            fontSize: "0.65rem",
          }}
        />
      </TableCell>
      <TableCell data-label="Actions">
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(t)}>
              <Pencil size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title={t.isActive ? "Deactivate" : "Activate"}>
            <IconButton size="small" onClick={() => onToggleActive(t)}>
              {t.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(t)}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
