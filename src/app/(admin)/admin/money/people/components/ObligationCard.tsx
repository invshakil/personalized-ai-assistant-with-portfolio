import { Box, Button, Card, Chip, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { fmt } from "../../format";
import type { ObligationDirection, ObligationRow } from "@/types";

const DIR_LABEL: Record<ObligationDirection, string> = {
  OWED_BY_ME: "I owe them",
  OWED_TO_ME: "They owe me",
};

interface Props {
  obligation: ObligationRow;
  isAddingDue: boolean;
  addDueAmount: string;
  addDueSaving: boolean;
  onStartAddDue: (id: string) => void;
  onCancelAddDue: () => void;
  onAddDueAmountChange: (value: string) => void;
  onAddToDue: (o: ObligationRow) => void;
  isEditing: boolean;
  editAmount: string;
  editSaving: boolean;
  onStartEdit: (o: ObligationRow) => void;
  onCancelEdit: () => void;
  onEditAmountChange: (value: string) => void;
  onSaveObligation: (o: ObligationRow) => void;
  onDeleteObligation: (o: ObligationRow) => void;
}

export default function ObligationCard({
  obligation: o,
  isAddingDue,
  addDueAmount,
  addDueSaving,
  onStartAddDue,
  onCancelAddDue,
  onAddDueAmountChange,
  onAddToDue,
  isEditing,
  editAmount,
  editSaving,
  onStartEdit,
  onCancelEdit,
  onEditAmountChange,
  onSaveObligation,
  onDeleteObligation,
}: Props) {
  return (
    <Card sx={{ bgcolor: "background.default", p: 1.5, mb: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Chip
            size="small"
            label={o.type === "LOAN" ? "Loan" : "Recurring"}
            color={o.type === "LOAN" ? "info" : "default"}
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <Typography variant="caption" color="text.secondary">
            {DIR_LABEL[o.direction]} · {fmt(o.amount)}
            {o.type === "RECURRING" && o.frequency ? ` / ${o.frequency}` : ""}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {o.type === "LOAN" && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 700,
                mr: 0.5,
                color: o.outstanding > 0 ? "error.main" : "success.main",
              }}
            >
              {o.outstanding > 0 ? `${fmt(o.outstanding)} left` : "settled"}
            </Typography>
          )}
          <Tooltip title="Edit amount">
            <IconButton size="small" onClick={() => onStartEdit(o)}>
              <Pencil size={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDeleteObligation(o)}>
              <Trash2 size={15} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {isEditing && (
        <Box sx={{ display: "flex", gap: 1, mt: 1.5, alignItems: "center" }}>
          <TextField
            autoFocus
            label="Amount (৳)"
            type="number"
            size="small"
            sx={{ width: 150 }}
            value={editAmount}
            onChange={(e) => onEditAmountChange(e.target.value)}
          />
          <Button
            size="small"
            variant="contained"
            onClick={() => onSaveObligation(o)}
            disabled={editSaving || !editAmount}
          >
            {editSaving ? "Saving…" : "Save"}
          </Button>
          <Button size="small" color="inherit" onClick={onCancelEdit}>
            Cancel
          </Button>
        </Box>
      )}

      {o.type === "LOAN" &&
        !isEditing &&
        (isAddingDue ? (
          <Box sx={{ display: "flex", gap: 1, mt: 1.5, alignItems: "center" }}>
            <TextField
              autoFocus
              label="Add amount (৳)"
              type="number"
              size="small"
              sx={{ width: 150 }}
              value={addDueAmount}
              onChange={(e) => onAddDueAmountChange(e.target.value)}
            />
            <Button
              size="small"
              variant="contained"
              onClick={() => onAddToDue(o)}
              disabled={addDueSaving || !addDueAmount}
            >
              {addDueSaving ? "Adding…" : "Add"}
            </Button>
            <Button size="small" color="inherit" onClick={onCancelAddDue}>
              Cancel
            </Button>
          </Box>
        ) : (
          <Button
            size="small"
            startIcon={<Plus size={14} />}
            sx={{ mt: 1 }}
            onClick={() => onStartAddDue(o.id)}
          >
            {o.direction === "OWED_BY_ME" ? "Add to due (new purchase)" : "Lend more"}
          </Button>
        ))}
    </Card>
  );
}
