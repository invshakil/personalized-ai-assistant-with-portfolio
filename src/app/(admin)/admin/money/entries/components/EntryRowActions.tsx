import { Box, IconButton, Tooltip } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import type { MoneyEntryRow } from "@/types";

interface EntryRowActionsProps {
  entry: MoneyEntryRow;
  onEdit: (e: MoneyEntryRow) => void;
  onDelete: (id: string) => void;
}

export default function EntryRowActions({ entry: e, onEdit, onDelete }: EntryRowActionsProps) {
  return (
    <Box sx={{ display: "flex" }}>
      {e.direction !== "TRANSFER" && (
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(e)}>
            <Pencil size={14} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => onDelete(e.id)}>
          <Trash2 size={14} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
