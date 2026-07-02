import { Box, Button, Typography } from "@mui/material";
import { Plus } from "lucide-react";
import type { PaymentTransaction, PaymentWithTenant } from "@/types";
import BillBreakdown from "./BillBreakdown";
import TransactionItem from "./TransactionItem";

interface TransactionLogProps {
  payment: PaymentWithTenant;
  onEdit: (tx: PaymentTransaction) => void;
  onDelete: (txId: string, isAdvance: boolean) => void;
  onAddTransaction: (payment: PaymentWithTenant) => void;
}

export default function TransactionLog({
  payment: p,
  onEdit,
  onDelete,
  onAddTransaction,
}: TransactionLogProps) {
  return (
    <Box sx={{ bgcolor: "action.hover", px: 5, py: 1.5 }}>
      <BillBreakdown payment={p} />
      {p.transactions.length > 0 ? (
        p.transactions.map((tx) => (
          <TransactionItem key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
        ))
      ) : (
        <Typography variant="caption" color="text.secondary">
          No transactions yet
        </Typography>
      )}
      {p.balance > 0 && (
        <Button
          size="small"
          startIcon={<Plus size={12} />}
          sx={{ mt: 1, fontSize: "0.75rem" }}
          onClick={() => onAddTransaction(p)}
        >
          Add transaction
        </Button>
      )}
    </Box>
  );
}
