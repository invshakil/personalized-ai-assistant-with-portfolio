import {
  Box,
  Button,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import type { TripSettlementRow } from "@/types";
import { fmt, fmtCurrency, fmtDate } from "../../format";

interface Props {
  settlements: TripSettlementRow[];
  onAdd: () => void;
  onDelete: (s: TripSettlementRow) => void;
}

export default function SettlementPanel({ settlements, onAdd, onDelete }: Props) {
  return (
    <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Payments &amp; contributions
        </Typography>
        <Button size="small" variant="outlined" startIcon={<Add />} onClick={onAdd}>
          Record payment
        </Button>
      </Box>
      <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
        Money handed between people (collect fund / settle up). Tracked here only — not in your
        money ledger.
      </Typography>
      {settlements.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary", py: 1 }}>
          No payments recorded yet.
        </Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>From → To</TableCell>
                <TableCell>Note</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {settlements.map((s) => {
                const foreign = s.currency !== "BDT";
                return (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDate(s.date)}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {s.fromName} → {s.toName}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>{s.note || "—"}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {fmtCurrency(s.amount, s.currency)}
                      </Typography>
                      {foreign && (
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          ≈ {fmt(s.amountBdt)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => onDelete(s)}>
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
