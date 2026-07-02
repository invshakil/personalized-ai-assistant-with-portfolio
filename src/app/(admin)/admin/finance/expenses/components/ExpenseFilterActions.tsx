import { Box, Button } from "@mui/material";
import { Plus, Download } from "lucide-react";

interface ExpenseFilterActionsProps {
  downloadHref: string;
  downloadDisabled: boolean;
  onAdd: () => void;
}

export default function ExpenseFilterActions({
  downloadHref,
  downloadDisabled,
  onAdd,
}: ExpenseFilterActionsProps) {
  return (
    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
      <Button
        variant="outlined"
        startIcon={<Download size={16} />}
        disabled={downloadDisabled}
        onClick={() => window.open(downloadHref, "_blank")}
      >
        Download all
      </Button>
      <Button variant="contained" startIcon={<Plus size={16} />} onClick={onAdd}>
        Add Expense
      </Button>
    </Box>
  );
}
