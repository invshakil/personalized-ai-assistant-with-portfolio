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
import type { SubscriptionRow } from "../../types";
import SubscriptionTableRow from "./SubscriptionTableRow";

interface SubscriptionTableProps {
  loading: boolean;
  subs: SubscriptionRow[];
  hasActiveFilters: boolean;
  onManage: (id: string) => void;
  onEdit: (sub: SubscriptionRow) => void;
  onStop: (sub: SubscriptionRow) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function SubscriptionTable({
  loading,
  subs,
  hasActiveFilters,
  onManage,
  onEdit,
  onStop,
  onResume,
  onDelete,
}: SubscriptionTableProps) {
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
            <TableCell sx={{ fontWeight: 700 }}>Service</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Monthly
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Started</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Total Spent
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {subs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {hasActiveFilters
                    ? "No subscriptions match these filters"
                    : "No subscriptions yet"}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            subs.map((s) => (
              <SubscriptionTableRow
                key={s.id}
                sub={s}
                onManage={onManage}
                onEdit={onEdit}
                onStop={onStop}
                onResume={onResume}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
