import {
  Box,
  Button,
  Card,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { TRIP_CATEGORY_LABEL, type TripCategoryReport } from "@/types";
import { fmt } from "../../format";

interface Props {
  byCategory: TripCategoryReport[];
  onEditBudgets: () => void;
}

export default function TripBudgetPanel({ byCategory, onEditBudgets }: Props) {
  // Show categories that have either a plan or actual spend.
  const rows = byCategory.filter((c) => c.plannedBdt > 0 || c.actualBdt > 0);

  return (
    <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Budget vs actual
        </Typography>
        <Button size="small" onClick={onEditBudgets}>
          Edit budgets
        </Button>
      </Box>
      {rows.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
          No budgets or spending yet.
        </Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Planned</TableCell>
              <TableCell align="right">Actual</TableCell>
              <TableCell sx={{ width: 140 }}>Progress</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((c) => {
              const pct =
                c.plannedBdt > 0 ? Math.min(100, (c.actualBdt / c.plannedBdt) * 100) : 100;
              const over = c.plannedBdt > 0 && c.actualBdt > c.plannedBdt;
              return (
                <TableRow key={c.category}>
                  <TableCell>{TRIP_CATEGORY_LABEL[c.category]}</TableCell>
                  <TableCell align="right">{c.plannedBdt > 0 ? fmt(c.plannedBdt) : "—"}</TableCell>
                  <TableCell align="right" sx={{ color: over ? "error.main" : "text.primary" }}>
                    {fmt(c.actualBdt)}
                  </TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      color={over ? "error" : "primary"}
                      sx={{ height: 6, borderRadius: 1 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
