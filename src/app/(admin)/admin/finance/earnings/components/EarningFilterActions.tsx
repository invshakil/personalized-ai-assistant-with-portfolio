import { Box, Button } from "@mui/material";
import { Plus, ArrowLeftRight } from "lucide-react";
import ExportMenuButton, { type ExportFormat } from "@/components/admin/ExportMenuButton";

interface EarningFilterActionsProps {
  hasEarnings: boolean;
  /** A foreign balance or pending foreign income exists to convert. */
  canConvert: boolean;
  exportHrefFor: (format: ExportFormat) => string;
  onOpenConvert: () => void;
  onOpenAdd: () => void;
}

export default function EarningFilterActions({
  hasEarnings,
  canConvert,
  exportHrefFor,
  onOpenConvert,
  onOpenAdd,
}: EarningFilterActionsProps) {
  return (
    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
      <ExportMenuButton hrefFor={exportHrefFor} disabled={!hasEarnings} />
      <Button
        variant="outlined"
        color="warning"
        startIcon={<ArrowLeftRight size={16} />}
        disabled={!canConvert}
        onClick={onOpenConvert}
      >
        Convert
      </Button>
      <Button variant="contained" startIcon={<Plus size={16} />} onClick={onOpenAdd}>
        Add Earning
      </Button>
    </Box>
  );
}
