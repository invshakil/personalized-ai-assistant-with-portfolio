import {
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { PropertyServiceType } from "@/types";
import ServiceTypeRow from "./ServiceTypeRow";

interface ServiceTypesTableProps {
  types: PropertyServiceType[];
  loading: boolean;
  onEdit: (t: PropertyServiceType) => void;
  onToggleActive: (t: PropertyServiceType) => void;
  onDelete: (t: PropertyServiceType) => void;
}

export default function ServiceTypesTable({
  types,
  loading,
  onEdit,
  onToggleActive,
  onDelete,
}: ServiceTypesTableProps) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent sx={{ p: "0 !important" }}>
        <TableContainer>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, pl: 3 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {types.map((t) => (
                <ServiceTypeRow
                  key={t.id}
                  type={t}
                  onEdit={onEdit}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
