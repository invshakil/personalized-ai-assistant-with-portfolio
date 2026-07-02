import { Box, IconButton, Tooltip } from "@mui/material";
import { ArrowLeftRight, Download, Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { EarningRow } from "../../types";

interface EarningRowActionsProps {
  earning: EarningRow;
  reversingId: string | null;
  onConvert: (currency: string, id: string) => void;
  onReverse: (id: string) => void;
  onEdit: (e: EarningRow) => void;
  onDelete: (id: string) => void;
}

export default function EarningRowActions({
  earning: e,
  reversingId,
  onConvert,
  onReverse,
  onEdit,
  onDelete,
}: EarningRowActionsProps) {
  return (
    <Box sx={{ display: "flex" }}>
      {e.pendingConversion && (
        <Tooltip title="Convert to BDT">
          <IconButton size="small" color="warning" onClick={() => onConvert(e.currency, e.id)}>
            <ArrowLeftRight size={14} />
          </IconButton>
        </Tooltip>
      )}
      {e.currency !== "BDT" && e.realizedAt && (
        <Tooltip title="Reverse conversion (back to pending)">
          <IconButton size="small" disabled={reversingId === e.id} onClick={() => onReverse(e.id)}>
            <RotateCcw size={14} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Download receipt">
        <IconButton
          size="small"
          onClick={() => window.open(`/api/admin/finance/earnings/${e.id}/receipt`, "_blank")}
        >
          <Download size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(e)}>
          <Pencil size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => onDelete(e.id)}>
          <Trash2 size={14} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
