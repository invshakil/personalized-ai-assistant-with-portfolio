import { Box, IconButton, Tooltip } from "@mui/material";
import { Pencil, Trash2, CircleStop, Play, SlidersHorizontal } from "lucide-react";
import type { SubscriptionRow } from "../../types";

interface SubscriptionRowActionsProps {
  sub: SubscriptionRow;
  onManage: (id: string) => void;
  onEdit: (sub: SubscriptionRow) => void;
  onStop: (sub: SubscriptionRow) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SubscriptionRowActions({
  sub,
  onManage,
  onEdit,
  onStop,
  onResume,
  onDelete,
}: SubscriptionRowActionsProps) {
  return (
    <Box sx={{ display: "flex" }}>
      <Tooltip title="Manage pricing & history">
        <IconButton size="small" onClick={() => onManage(sub.id)}>
          <SlidersHorizontal size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(sub)}>
          <Pencil size={14} />
        </IconButton>
      </Tooltip>
      {sub.isActive ? (
        <Tooltip title="Stop subscription">
          <IconButton size="small" color="warning" onClick={() => onStop(sub)}>
            <CircleStop size={14} />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Resume subscription">
          <IconButton size="small" color="success" onClick={() => onResume(sub.id)}>
            <Play size={14} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => onDelete(sub.id)}>
          <Trash2 size={14} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
