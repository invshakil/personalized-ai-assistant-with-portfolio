import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import { ArrowUpDown } from "lucide-react";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import { swapTransferDirection, type TransferForm } from "../types";

interface TransferAccountFieldsProps {
  transfer: TransferForm;
  setTransfer: React.Dispatch<React.SetStateAction<TransferForm>>;
  accounts: MoneyAccountRow[];
}

export default function TransferAccountFields({
  transfer,
  setTransfer,
  accounts,
}: TransferAccountFieldsProps) {
  // Nothing to swap before either side is picked. The span is there because MUI
  // drops tooltips on a disabled button — it has no pointer events of its own.
  const canSwap = !!transfer.fromAccountId || !!transfer.toAccountId;

  return (
    <>
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={transfer.date}
        onChange={(e) => setTransfer((t) => ({ ...t, date: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="From"
        value={transfer.fromAccountId}
        options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        onChange={(v) => setTransfer((t) => ({ ...t, fromAccountId: v }))}
        sx={{ mb: 1 }}
      />
      <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
        <Tooltip title="Swap From and To">
          <span>
            <IconButton
              size="small"
              aria-label="Swap From and To"
              disabled={!canSwap}
              onClick={() => setTransfer(swapTransferDirection)}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                color: "text.secondary",
                "&:hover": { color: "primary.main", borderColor: "primary.main" },
              }}
            >
              <ArrowUpDown size={14} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <SearchableSelect
        label="To"
        value={transfer.toAccountId}
        options={accounts
          .filter((a) => a.id !== transfer.fromAccountId)
          .map((a) => ({ value: a.id, label: a.name }))}
        onChange={(v) => setTransfer((t) => ({ ...t, toAccountId: v }))}
        sx={{ mb: 2 }}
      />
    </>
  );
}
