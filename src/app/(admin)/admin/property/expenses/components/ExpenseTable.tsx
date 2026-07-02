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
import type { PropertyExpense } from "@/types";
import ExpenseRow from "./ExpenseRow";

interface ExpenseTableProps {
  expenses: PropertyExpense[];
  onEdit: (e: PropertyExpense) => void;
  onDelete: (id: string) => void;
  onPayeeClick: (payeeId: string) => void;
}

export default function ExpenseTable({
  expenses,
  onEdit,
  onDelete,
  onPayeeClick,
}: ExpenseTableProps) {
  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Service Type</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Payee</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {expenses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">No expenses for this period</Typography>
              </TableCell>
            </TableRow>
          ) : (
            expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                onEdit={onEdit}
                onDelete={onDelete}
                onPayeeClick={onPayeeClick}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
