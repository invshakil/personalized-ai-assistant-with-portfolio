import { Chip } from "@mui/material";

interface StatusChipProps {
  isOccupied: boolean;
}

export default function StatusChip({ isOccupied }: StatusChipProps) {
  return (
    <Chip
      label={isOccupied ? "Occupied" : "Vacant"}
      size="small"
      sx={{
        bgcolor: isOccupied ? "success.main" : "warning.main",
        color: "#fff",
        fontWeight: 600,
        fontSize: "0.6875rem",
        height: 20,
      }}
    />
  );
}
