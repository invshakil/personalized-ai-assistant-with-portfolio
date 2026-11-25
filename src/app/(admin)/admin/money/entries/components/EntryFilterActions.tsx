import { Box, Button } from "@mui/material";
import { Plus, ArrowLeftRight } from "lucide-react";
import ExportMenuButton, { type ExportFormat } from "@/components/admin/ExportMenuButton";

interface EntryFilterActionsProps {
  onOpenTransfer: () => void;
  onOpenAdd: () => void;
  /**
   * Held until the accounts, categories and stored defaults have all arrived.
   * Both drawers seed their dropdowns on open and cannot re-seed afterwards, so
   * opening one early gives a form that is silently missing its defaults.
   */
  disabled?: boolean;
  /** Export route URL for the ledger as currently filtered. */
  exportHrefFor: (format: ExportFormat) => string;
  /** Nothing on screen to export. */
  exportDisabled?: boolean;
}

export default function EntryFilterActions({
  onOpenTransfer,
  onOpenAdd,
  disabled = false,
  exportHrefFor,
  exportDisabled = false,
}: EntryFilterActionsProps) {
  return (
    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
      <ExportMenuButton hrefFor={exportHrefFor} disabled={exportDisabled} />
      <Button
        variant="outlined"
        startIcon={<ArrowLeftRight size={16} />}
        onClick={onOpenTransfer}
        disabled={disabled}
      >
        Transfer
      </Button>
      <Button
        variant="contained"
        startIcon={<Plus size={16} />}
        onClick={onOpenAdd}
        disabled={disabled}
      >
        Add Entry
      </Button>
    </Box>
  );
}
