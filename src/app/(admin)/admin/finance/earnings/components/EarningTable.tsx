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
import type { EarningRow } from "../../types";
import EarningTableRow from "./EarningTableRow";

interface EarningTableProps {
  earnings: EarningRow[];
  hasActiveFilters: boolean;
  reversingId: string | null;
  onConvert: (currency: string, id: string) => void;
  onReverse: (id: string) => void;
  onEdit: (e: EarningRow) => void;
  onDelete: (id: string) => void;
}

export default function EarningTable({
  earnings,
  hasActiveFilters,
  reversingId,
  onConvert,
  onReverse,
  onEdit,
  onDelete,
}: EarningTableProps) {
  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Amount
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {earnings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {hasActiveFilters ? "No earnings match these filters" : "No earnings yet"}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            earnings.map((e) => (
              <EarningTableRow
                key={e.id}
                earning={e}
                reversingId={reversingId}
                onConvert={onConvert}
                onReverse={onReverse}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
