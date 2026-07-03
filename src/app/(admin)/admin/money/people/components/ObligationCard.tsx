import { Box, Button, Card, Chip, TextField, Typography } from "@mui/material";
import { Plus } from "lucide-react";
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
        {o.type === "LOAN" && (
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color: o.outstanding > 0 ? "error.main" : "success.main" }}
          >
            {o.outstanding > 0 ? `${fmt(o.outstanding)} left` : "settled"}
          </Typography>
        )}
      </Box>
      {o.type === "LOAN" &&
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
