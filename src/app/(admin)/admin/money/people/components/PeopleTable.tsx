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
import type { BeneficiaryRow } from "@/types";
import PersonRow from "./PersonRow";

interface Props {
  people: BeneficiaryRow[];
  loading: boolean;
  onView: (id: string) => void;
  onEdit: (person: BeneficiaryRow) => void;
  onDelete: (person: BeneficiaryRow) => void;
}

export default function PeopleTable({ people, loading, onView, onEdit, onDelete }: Props) {
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
            <TableCell sx={{ fontWeight: 700 }}>Relationship</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              I owe
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Owes me
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Total paid
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {people.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">No people yet</Typography>
              </TableCell>
            </TableRow>
          ) : (
            people.map((b) => (
              <PersonRow
                key={b.id}
                person={b}
                onView={onView}
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
