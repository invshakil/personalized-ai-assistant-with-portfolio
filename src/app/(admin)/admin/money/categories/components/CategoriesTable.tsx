import {
  Box,
  Card,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyCategoryRow } from "@/types";
import CategoryRow from "./CategoryRow";

interface Props {
  rows: MoneyCategoryRow[];
  loading: boolean;
  emptyMessage: string;
  onEdit: (c: MoneyCategoryRow) => void;
  onDelete: (c: MoneyCategoryRow) => void;
}

export default function CategoriesTable({ rows, loading, emptyMessage, onEdit, onDelete }: Props) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Kind</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Entries
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((c) => (
              <CategoryRow key={c.id} category={c} onEdit={onEdit} onDelete={onDelete} />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
