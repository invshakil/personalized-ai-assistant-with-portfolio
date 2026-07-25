import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import { TRIP_CATEGORY_LABEL, type MoneyEntryRow, type TripCategory } from "@/types";
import { fmt, fmtCurrency, fmtDate } from "../../format";

interface Props {
  expenses: MoneyEntryRow[];
  onAdd: () => void;
  onEdit: (r: MoneyEntryRow) => void;
  onDelete: (r: MoneyEntryRow) => void;
}

export default function TripExpensesTable({ expenses, onAdd, onEdit, onDelete }: Props) {
  return (
    <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Expenses
        </Typography>
        <Button size="small" variant="contained" startIcon={<Add />} onClick={onAdd}>
          Add expense
        </Button>
      </Box>
      {expenses.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
          No expenses recorded yet.
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Paid from</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => {
                const card = e.accountType === "CREDIT_CARD";
                const foreign = e.currency !== "BDT";
                return (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(e.date)}</TableCell>
                    <TableCell>
                      {TRIP_CATEGORY_LABEL[(e.tripCategory ?? "MISC") as TripCategory]}
                    </TableCell>
                    <TableCell>{e.description || "—"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {e.accountName || "—"}
                      <Chip
                        size="small"
                        label={card ? "Card" : "Cash/bank"}
                        color={card ? "warning" : "default"}
                        variant="outlined"
                        sx={{ ml: 0.5, height: 18, fontSize: 10 }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fmtCurrency(e.amount, e.currency)}
                      </Typography>
                      {foreign && (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          ≈ {fmt(e.amount * (e.fxRate ?? 1))}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <IconButton size="small" onClick={() => onEdit(e)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => onDelete(e)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      )}
    </Card>
  );
}
