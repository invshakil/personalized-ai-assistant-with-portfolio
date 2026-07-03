import { Fragment } from "react";
import NextLink from "next/link";
import { Box, Chip, Collapse, IconButton, TableCell, TableRow, Tooltip } from "@mui/material";
import { ChevronDown, ChevronRight, Pencil, PiggyBank, Trash2 } from "lucide-react";
import type { MoneyAccountRow, MoneyEntryRow } from "@/types";
import { fmtCurrency, ACCOUNT_TYPE_LABEL } from "../../format";
import AccountTransactionsPanel from "./AccountTransactionsPanel";

const balanceColor = (a: MoneyAccountRow) => {
  if (a.type === "CREDIT_CARD") return a.balance < 0 ? "error.main" : "success.main";
  return a.balance < 0 ? "error.main" : "text.primary";
};

interface Props {
  account: MoneyAccountRow;
  expanded: boolean;
  txLoading: boolean;
  entries: MoneyEntryRow[] | undefined;
  onToggleExpand: (id: string) => void;
  onEdit: (a: MoneyAccountRow) => void;
  onDelete: (a: MoneyAccountRow) => void;
}

/** One account row plus its collapsible "recent transactions" panel. */
export default function AccountRow({
  account: a,
  expanded,
  txLoading,
  entries,
  onToggleExpand,
  onEdit,
  onDelete,
}: Props) {
  return (
    <Fragment>
      <TableRow hover onClick={() => onToggleExpand(a.id)} sx={{ cursor: "pointer" }}>
        <TableCell data-label="Name" sx={{ fontWeight: 600 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            {a.name}
          </Box>
        </TableCell>
        <TableCell data-label="Type">
          {ACCOUNT_TYPE_LABEL[a.type]}
          {a.currency !== "BDT" && (
            <Chip
              size="small"
              label={a.currency}
              variant="outlined"
              sx={{ ml: 0.5, height: 18, fontSize: "0.65rem" }}
            />
          )}
        </TableCell>
        <TableCell
          align="right"
          data-label="Balance"
          sx={{ fontWeight: 700, color: balanceColor(a) }}
        >
          {fmtCurrency(a.balance, a.currency)}
        </TableCell>
        <TableCell align="right" data-label="Available credit">
          {a.availableCredit != null ? fmtCurrency(a.availableCredit, a.currency) : "—"}
        </TableCell>
        <TableCell data-label="Status">
          <Chip
            size="small"
            label={a.isActive ? "Active" : "Inactive"}
            color={a.isActive ? "success" : "default"}
            variant="outlined"
          />
        </TableCell>
        <TableCell data-label="Actions">
          <Box sx={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Deposit">
              <IconButton
                size="small"
                component={NextLink}
                href={`/admin/money/entries?deposit=${a.id}`}
              >
                <PiggyBank size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(a)}>
                <Pencil size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(a)}>
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, border: 0, bgcolor: "action.hover" }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <AccountTransactionsPanel accountId={a.id} loading={txLoading} entries={entries} />
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
}
