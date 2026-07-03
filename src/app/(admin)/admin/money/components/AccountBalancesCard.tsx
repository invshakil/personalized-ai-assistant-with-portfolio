import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Card,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyDashboardData } from "@/types";
import { ACCOUNT_TYPE_LABEL, fmtCurrency } from "../format";

interface AccountBalancesCardProps {
  accounts: MoneyDashboardData["accounts"];
}

export default function AccountBalancesCard({ accounts }: AccountBalancesCardProps) {
  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, px: 2, pt: 2 }}>
        Account balances
      </Typography>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Balance
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {accounts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} sx={{ textAlign: "center", py: 3 }}>
                <Typography color="text.secondary" variant="body2">
                  No accounts yet
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            accounts.map((a) => (
              <TableRow key={a.id} hover>
                <TableCell data-label="Account" sx={{ fontWeight: 600 }}>
                  {a.name}
                </TableCell>
                <TableCell data-label="Type">
                  {ACCOUNT_TYPE_LABEL[a.type]}
                  {a.currency !== "BDT" ? ` · ${a.currency}` : ""}
                </TableCell>
                <TableCell
                  align="right"
                  data-label="Balance"
                  sx={{
                    fontWeight: 700,
                    color: a.balance < 0 ? "error.main" : "text.primary",
                  }}
                >
                  {fmtCurrency(a.balance, a.currency)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
