import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import type { TenantWithUnit } from "@/types";
import { fmt } from "../utils";
import PendingRentChangeEditForm from "./PendingRentChangeEditForm";

type RentChange = TenantWithUnit["rentChanges"][number];

interface PendingRentChangeItemProps {
  rc: RentChange;
  editing: boolean;
  editDate: string;
  onEditDateChange: (v: string) => void;
  editRent: string;
  onEditRentChange: (v: string) => void;
  editReason: string;
  onEditReasonChange: (v: string) => void;
  saving: boolean;
  onOpenEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
}

export default function PendingRentChangeItem({
  rc,
  editing,
  editDate,
  onEditDateChange,
  editRent,
  onEditRentChange,
  editReason,
  onEditReasonChange,
  saving,
  onOpenEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: PendingRentChangeItemProps) {
  if (editing) {
    return (
      <PendingRentChangeEditForm
        editDate={editDate}
        onEditDateChange={onEditDateChange}
        editRent={editRent}
        onEditRentChange={onEditRentChange}
        editReason={editReason}
        onEditReasonChange={onEditReasonChange}
        saving={saving}
        onCancel={onCancelEdit}
        onSave={onSaveEdit}
      />
    );
  }

  return (
    <Box sx={{ mt: 1.5, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
      <Typography variant="body2">
        {fmt(rc.previousRent)} → {fmt(rc.newRent)}
      </Typography>
      <Chip
        label={`Effective ${new Date(rc.effectiveDate).toLocaleDateString()}`}
        size="small"
        sx={{ bgcolor: "warning.main", color: "#fff", fontSize: "0.6875rem" }}
      />
      {rc.reason && (
        <Typography variant="caption" color="text.secondary">
          {rc.reason}
        </Typography>
      )}
      <Box sx={{ ml: "auto", display: "flex", gap: 0.5 }}>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={onOpenEdit}>
            <Pencil size={13} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={onDelete}>
            <Trash2 size={13} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
