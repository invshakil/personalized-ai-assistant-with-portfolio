import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import type { PaymentTransaction } from "@/types";
import { fmt } from "../types";

interface TransactionItemProps {
  tx: PaymentTransaction;
  onEdit: (tx: PaymentTransaction) => void;
  onDelete: (txId: string, isAdvance: boolean) => void;
}

export default function TransactionItem({ tx, onEdit, onDelete }: TransactionItemProps) {
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 0.5, alignItems: "center" }}>
      <Typography variant="caption" color="text.secondary" sx={{ width: 86, flexShrink: 0 }}>
        {new Date(tx.date).toLocaleDateString()}
      </Typography>
      <Chip
        label={tx.type.replace(/_/g, " ")}
        size="small"
        variant="outlined"
        sx={{ fontSize: "0.65rem", height: 18 }}
      />
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        {fmt(tx.amount)}
      </Typography>
      {tx.notes && (
        <Typography variant="caption" color="text.secondary">
          · {tx.notes}
        </Typography>
      )}
      <Box sx={{ ml: "auto", display: "flex", gap: 0 }}>
        <Tooltip title="Edit transaction">
          <IconButton size="small" onClick={() => onEdit(tx)}>
            <Pencil size={12} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete transaction">
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(tx.id, tx.type === "ADVANCE_APPLIED")}
          >
            <Trash2 size={12} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
