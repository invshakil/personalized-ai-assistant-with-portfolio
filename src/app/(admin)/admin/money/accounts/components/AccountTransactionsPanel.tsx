import NextLink from "next/link";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import type { MoneyEntryRow } from "@/types";
import { fmtCurrency, fmtDate } from "../../format";

const amountColor = (d: MoneyEntryRow["direction"]) =>
  d === "CREDIT" ? "success.main" : d === "DEBIT" ? "error.main" : "text.secondary";

const amountText = (e: MoneyEntryRow) =>
  e.direction === "CREDIT"
    ? `+${fmtCurrency(e.amount, e.currency)}`
    : e.direction === "DEBIT"
      ? `−${fmtCurrency(e.amount, e.currency)}`
      : fmtCurrency(e.amount, e.currency);

const entryLabel = (e: MoneyEntryRow) =>
  e.direction === "TRANSFER"
    ? `${e.accountName ?? "—"} → ${e.transferAccountName ?? "—"}`
    : (e.categoryName ?? e.description ?? "—");

interface Props {
  accountId: string;
  loading: boolean;
  entries: MoneyEntryRow[] | undefined;
}

/** Inline "recent transactions" content shown inside a collapsed account row. */
export default function AccountTransactionsPanel({ accountId, loading, entries }: Props) {
  return (
    <Box sx={{ px: 2, py: 1.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
          Recent transactions
        </Typography>
        <Button
          component={NextLink}
          href={`/admin/money/entries?account=${accountId}&period=all`}
          size="small"
          sx={{ ml: "auto", fontSize: "0.7rem", py: 0 }}
        >
          View all
        </Button>
      </Box>
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <CircularProgress size={18} />
        </Box>
      ) : (entries?.length ?? 0) === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No transactions yet.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {entries!.map((e) => (
            <Box
              key={e.id}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                py: 0.5,
                borderBottom: "1px solid",
                borderColor: "divider",
                "&:last-of-type": { borderBottom: 0 },
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ minWidth: 64, flexShrink: 0 }}
              >
                {fmtDate(e.date)}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entryLabel(e)}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: amountColor(e.direction) }}>
                {amountText(e)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
