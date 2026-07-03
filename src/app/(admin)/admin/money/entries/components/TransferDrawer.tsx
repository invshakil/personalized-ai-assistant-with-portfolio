import { Box, Drawer, Typography } from "@mui/material";
import type { MoneyAccountRow } from "@/types";
import type { TransferForm } from "../types";
import TransferDrawerFields from "./TransferDrawerFields";

interface TransferDrawerProps {
  open: boolean;
  transfer: TransferForm;
  setTransfer: React.Dispatch<React.SetStateAction<TransferForm>>;
  accounts: MoneyAccountRow[];
  transferSaving: boolean;
  transferError: string | null;
  onClose: () => void;
  onSave: () => void;
}

export default function TransferDrawer({
  open,
  transfer,
  setTransfer,
  accounts,
  transferSaving,
  transferError,
  onClose,
  onSave,
}: TransferDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Transfer between accounts
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          e.g. bank → cash withdrawal, or paying a credit-card bill. Not counted as income or
          expense.
        </Typography>
        <TransferDrawerFields
          transfer={transfer}
          setTransfer={setTransfer}
          accounts={accounts}
          transferSaving={transferSaving}
          transferError={transferError}
          onSave={onSave}
        />
      </Box>
    </Drawer>
  );
}
