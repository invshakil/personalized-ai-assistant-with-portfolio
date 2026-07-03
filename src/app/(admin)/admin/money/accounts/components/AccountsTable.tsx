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
import type { MoneyAccountRow, MoneyEntryRow } from "@/types";
import AccountRow from "./AccountRow";

interface Props {
  accounts: MoneyAccountRow[];
  loading: boolean;
  expandedId: string | null;
  txLoading: string | null;
  txByAccount: Record<string, MoneyEntryRow[]>;
  onToggleExpand: (id: string) => void;
  onEdit: (a: MoneyAccountRow) => void;
  onDelete: (a: MoneyAccountRow) => void;
}

export default function AccountsTable({
  accounts,
  loading,
  expandedId,
  txLoading,
  txByAccount,
  onToggleExpand,
  onEdit,
  onDelete,
}: Props) {
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
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Balance
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Available credit
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  No accounts yet — add your bank, cash and cards with their current balances.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((a) => (
              <AccountRow
                key={a.id}
                account={a}
                expanded={expandedId === a.id}
                txLoading={txLoading === a.id}
                entries={txByAccount[a.id]}
                onToggleExpand={onToggleExpand}
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
