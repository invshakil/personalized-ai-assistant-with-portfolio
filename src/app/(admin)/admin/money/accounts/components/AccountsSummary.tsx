import { Box, Card, Typography, Button } from "@mui/material";
import { Plus } from "lucide-react";
import { fmtCurrency } from "../../format";

interface Props {
  cashRows: [string, number][];
  cardDebtRows: [string, number][];
  onAdd: () => void;
}

export default function AccountsSummary({ cashRows, cardDebtRows, onAdd }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
      <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5, minWidth: 150 }}>
        <Typography variant="caption" color="text.secondary">
          Cash position
        </Typography>
        {cashRows.length === 0 ? (
          <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
            {fmtCurrency(0, "BDT")}
          </Typography>
        ) : (
          cashRows.map(([cur, total]) => (
            <Typography key={cur} variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
              {fmtCurrency(total, cur)}
            </Typography>
          ))
        )}
      </Card>
      {cardDebtRows.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", px: 3, py: 1.5, minWidth: 150 }}>
          <Typography variant="caption" color="text.secondary">
            Credit-card debt
          </Typography>
          {cardDebtRows.map(([cur, total]) => (
            <Typography key={cur} variant="h6" sx={{ fontWeight: 700, color: "error.main" }}>
              {fmtCurrency(total, cur)}
            </Typography>
          ))}
        </Card>
      )}
      <Button
        variant="contained"
        startIcon={<Plus size={16} />}
        onClick={onAdd}
        sx={{ ml: "auto", alignSelf: "center" }}
      >
        Add Account
      </Button>
    </Box>
  );
}
