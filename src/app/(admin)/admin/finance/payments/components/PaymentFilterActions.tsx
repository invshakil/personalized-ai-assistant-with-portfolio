import { Box, Button } from "@mui/material";
import { Plus, Download } from "lucide-react";

interface PaymentFilterActionsProps {
  hasPayments: boolean;
  onDownloadAll: () => void;
  onAdd: () => void;
}

export default function PaymentFilterActions({
  hasPayments,
  onDownloadAll,
  onAdd,
}: PaymentFilterActionsProps) {
  return (
    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
      <Button
        variant="outlined"
        startIcon={<Download size={16} />}
        disabled={!hasPayments}
        onClick={onDownloadAll}
      >
        Download all
      </Button>
      <Button variant="contained" startIcon={<Plus size={16} />} onClick={onAdd}>
        Add Payment
      </Button>
    </Box>
  );
}
