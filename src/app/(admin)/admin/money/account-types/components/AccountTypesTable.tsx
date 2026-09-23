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
import type { AccountTypeRow as Row } from "@/types";
import AccountTypeRow from "./AccountTypeRow";

interface Props {
  rows: Row[];
  loading: boolean;
  onEdit: (t: Row) => void;
  onArchive: (t: Row) => void;
  onReactivate: (t: Row) => void;
  onDelete: (t: Row) => void;
}

const HEAD = ["Name", "Behaves as", "Accounts", "Status", "Actions"];

export default function AccountTypesTable({ rows, loading, ...actions }: Props) {
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
            {HEAD.map((h) => (
              <TableCell
                key={h}
                align={h === "Accounts" ? "right" : "left"}
                sx={{ fontWeight: 700 }}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={HEAD.length} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">No account types</Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((t) => <AccountTypeRow key={t.id} type={t} {...actions} />)
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
