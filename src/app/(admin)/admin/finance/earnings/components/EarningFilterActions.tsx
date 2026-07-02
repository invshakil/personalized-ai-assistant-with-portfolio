import { Box, Button } from "@mui/material";
import { Plus, Download, ArrowLeftRight } from "lucide-react";

interface EarningFilterActionsProps {
  hasEarnings: boolean;
  hasPendingEarnings: boolean;
  downloadHref: string;
  onOpenConvert: () => void;
  onOpenAdd: () => void;
}

export default function EarningFilterActions({
  hasEarnings,
  hasPendingEarnings,
  downloadHref,
  onOpenConvert,
  onOpenAdd,
}: EarningFilterActionsProps) {
  return (
    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
      <Button
        variant="outlined"
        startIcon={<Download size={16} />}
        disabled={!hasEarnings}
        onClick={() => window.open(downloadHref, "_blank")}
      >
        Download all
      </Button>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<ArrowLeftRight size={16} />}
        disabled={!hasPendingEarnings}
        onClick={onOpenConvert}
      >
        Convert to BDT
      </Button>
      <Button variant="contained" startIcon={<Plus size={16} />} onClick={onOpenAdd}>
        Add Earning
      </Button>
    </Box>
  );
}
