import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { BizExpenseRow } from "../../types";
import ExpenseRow from "./ExpenseRow";

interface ExpenseTableProps {
  expenses: BizExpenseRow[];
  hasActiveFilters: boolean;
  onEdit: (e: BizExpenseRow) => void;
  onDelete: (id: string) => void;
}

export default function ExpenseTable({
  expenses,
  hasActiveFilters,
  onEdit,
  onDelete,
}: ExpenseTableProps) {
  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Tool / Service</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Recurring</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Amount
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {hasActiveFilters ? "No expenses match these filters" : "No expenses yet"}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((e) => (
              <ExpenseRow key={e.id} expense={e} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
