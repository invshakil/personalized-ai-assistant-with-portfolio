import { Box, Button, Chip, Typography } from "@mui/material";
import { Pencil } from "lucide-react";
import type { UnitDetail } from "../types";
import { fmt } from "../types";

interface UnitInfoViewProps {
  unit: UnitDetail;
  onEdit: () => void;
}

export default function UnitInfoView({ unit, onEdit }: UnitInfoViewProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Floor
          </Typography>
          <Typography variant="body2">{unit.floor}</Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Monthly Rent
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {fmt(unit.monthlyRent)}
          </Typography>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Status
          </Typography>
          <Box sx={{ mt: 0.25 }}>
            <Chip
              label={unit.isOccupied ? "Occupied" : "Vacant"}
              size="small"
              sx={{
                bgcolor: unit.isOccupied ? "success.main" : "warning.main",
                color: "#fff",
                fontSize: "0.6875rem",
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
        {unit.description && (
          <Box>
            <Typography variant="caption" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body2">{unit.description}</Typography>
          </Box>
        )}
      </Box>
      <Button variant="outlined" size="small" startIcon={<Pencil size={14} />} onClick={onEdit}>
        Edit Unit
      </Button>
    </Box>
  );
}
