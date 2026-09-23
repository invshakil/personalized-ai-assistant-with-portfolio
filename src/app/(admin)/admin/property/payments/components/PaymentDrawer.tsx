import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { MoneyAccountRow, PaymentWithTenant } from "@/types";
import PaymentDrawerSummary from "./PaymentDrawerSummary";
import PaymentDrawerFields from "./PaymentDrawerFields";
import type { AccountSelection } from "@/lib/accountPicker";

interface PaymentDrawerProps {
  drawer: { payment: PaymentWithTenant; mode: "pay" | "advance" } | null;
  onClose: () => void;
  txType: string;
  onTxTypeChange: (v: string) => void;
  accounts: MoneyAccountRow[];
  txAccount: AccountSelection;
  onTxAccountChange: (sel: AccountSelection) => void;
  txAmount: string;
  onTxAmountChange: (v: string) => void;
  txDate: string;
  onTxDateChange: (v: string) => void;
  txNotes: string;
  onTxNotesChange: (v: string) => void;
  txLoading: boolean;
  txError: string | null;
  onSubmit: () => void;
}

export default function PaymentDrawer({
  drawer,
  onClose,
  txType,
  onTxTypeChange,
  accounts,
  txAccount,
  onTxAccountChange,
  txAmount,
  onTxAmountChange,
  txDate,
  onTxDateChange,
  txNotes,
  onTxNotesChange,
  txLoading,
  txError,
  onSubmit,
}: PaymentDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={!!drawer}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          {drawer?.mode === "advance" ? "Apply Advance" : "Record Payment"}
        </Typography>
        {drawer && (
          <>
            <PaymentDrawerSummary payment={drawer.payment} mode={drawer.mode} />
            <PaymentDrawerFields
              payment={drawer.payment}
              mode={drawer.mode}
              txType={txType}
              onTxTypeChange={onTxTypeChange}
              accounts={accounts}
              txAccount={txAccount}
              onTxAccountChange={onTxAccountChange}
              txAmount={txAmount}
              onTxAmountChange={onTxAmountChange}
              txDate={txDate}
              onTxDateChange={onTxDateChange}
              txNotes={txNotes}
              onTxNotesChange={onTxNotesChange}
            />

            {txError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {txError}
              </Alert>
            )}

            <Button
              variant="contained"
              fullWidth
              onClick={onSubmit}
              disabled={txLoading || !txAmount || parseFloat(txAmount) <= 0}
            >
              {txLoading
                ? "Saving…"
                : drawer.mode === "advance"
                  ? "Apply Advance"
                  : "Record Payment"}
            </Button>
          </>
        )}
      </Box>
    </Drawer>
  );
}
