import { Button } from "@mui/material";

interface ClearFiltersButtonProps {
  onClear: () => void;
}

export default function ClearFiltersButton({ onClear }: ClearFiltersButtonProps) {
  return (
    <Button size="small" color="inherit" onClick={onClear}>
      Clear
    </Button>
  );
}
