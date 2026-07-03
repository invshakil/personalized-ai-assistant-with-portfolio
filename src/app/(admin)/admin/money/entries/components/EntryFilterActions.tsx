import { Box, Button } from "@mui/material";
import { Plus, ArrowLeftRight } from "lucide-react";

interface EntryFilterActionsProps {
  onOpenTransfer: () => void;
  onOpenAdd: () => void;
}

export default function EntryFilterActions({ onOpenTransfer, onOpenAdd }: EntryFilterActionsProps) {
  return (
    <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
      <Button variant="outlined" startIcon={<ArrowLeftRight size={16} />} onClick={onOpenTransfer}>
        Transfer
      </Button>
      <Button variant="contained" startIcon={<Plus size={16} />} onClick={onOpenAdd}>
        Add Entry
      </Button>
    </Box>
  );
}
