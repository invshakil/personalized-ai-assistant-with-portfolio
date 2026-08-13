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
  Tooltip,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import { TRIP_CATEGORY_LABEL, type TripExpenseRow } from "@/types";
import { fmt, fmtCurrency, fmtDate } from "../../format";

interface Props {
  expenses: TripExpenseRow[];
  /** Filter bar rendered under the header — supplied by the orchestrator. */
  filters?: React.ReactNode;
  /** True when a filter is narrowing the list, so the empty state can say so. */
  filtered?: boolean;
  onAdd: () => void;
  onEdit: (r: TripExpenseRow) => void;
  onDelete: (r: TripExpenseRow) => void;
}

function PaidVia({ e }: { e: TripExpenseRow }) {
  if (!e.payerIsSelf) {
    return (
      <Chip size="small" label="Friend paid" color="info" variant="outlined" sx={{ height: 20 }} />
    );
  }
  const card = e.accountType === "CREDIT_CARD";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
      <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
        {e.accountName || "—"}
      </Typography>
      <Chip
        size="small"
        label={card ? "Card · deferred" : "Cash/bank"}
        color={card ? "warning" : "default"}
        variant="outlined"
        sx={{ height: 20, fontSize: 10 }}
      />
    </Box>
  );
}

export default function TripExpensesTable({
  expenses,
  filters,
  filtered = false,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
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
      {filters}
      {expenses.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 2 }}>
          {filtered ? "No expenses match these filters." : "No expenses recorded yet."}
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Paid by</TableCell>
                <TableCell>Via</TableCell>
                <TableCell align="center">Split</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((e) => {
                const foreign = e.currency !== "BDT";
                const n = e.shares.length;
                const splitLabel = n <= 1 ? "Solo" : `${n} ways`;
                const splitTip = e.shares
                  .map((s) => `${s.participantName}: ${fmtCurrency(s.amount, e.currency)}`)
                  .join("\n");
                return (
                  <TableRow key={e.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(e.date)}</TableCell>
                    <TableCell>{TRIP_CATEGORY_LABEL[e.category]}</TableCell>
                    <TableCell>{e.description || "—"}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {e.payerName}
                      {e.payerIsSelf ? " (me)" : ""}
                    </TableCell>
                    <TableCell>
                      <PaidVia e={e} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={<Box sx={{ whiteSpace: "pre-line" }}>{splitTip}</Box>}>
                        <Chip
                          size="small"
                          label={splitLabel}
                          variant="outlined"
                          sx={{ height: 20 }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fmtCurrency(e.amount, e.currency)}
                      </Typography>
                      {foreign && (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          ≈ {fmt(e.amountBdt)}
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
