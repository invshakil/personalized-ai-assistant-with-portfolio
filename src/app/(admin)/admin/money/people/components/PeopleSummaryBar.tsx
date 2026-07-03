import { Box, Card, Typography, Button } from "@mui/material";
import { Plus } from "lucide-react";
import { fmt } from "../../format";

interface Props {
  totalOwedByMe: number;
  totalOwedToMe: number;
  onAdd: () => void;
}

export default function PeopleSummaryBar({ totalOwedByMe, totalOwedToMe, onAdd }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
      <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          I still owe
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
          {fmt(totalOwedByMe)}
        </Typography>
      </Card>
      <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5 }}>
        <Typography variant="caption" color="text.secondary">
          Owed to me
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
          {fmt(totalOwedToMe)}
        </Typography>
      </Card>
      <Button
        variant="contained"
        startIcon={<Plus size={16} />}
        onClick={onAdd}
        sx={{ ml: "auto", alignSelf: "center" }}
      >
        Add Person
      </Button>
    </Box>
  );
}
