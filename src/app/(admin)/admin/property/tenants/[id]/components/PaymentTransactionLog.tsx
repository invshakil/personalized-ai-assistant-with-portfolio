import { Box, Chip, Collapse, TableCell, TableRow, Typography } from "@mui/material";
import type { PaymentWithTenant } from "@/types";
import { fmt } from "../utils";

interface PaymentTransactionLogProps {
  transactions: PaymentWithTenant["transactions"];
  expanded: boolean;
}

export default function PaymentTransactionLog({
  transactions,
  expanded,
}: PaymentTransactionLogProps) {
  return (
    <TableRow>
      <TableCell colSpan={8} sx={{ p: 0, border: 0 }}>
        <Collapse in={expanded}>
          <Box sx={{ bgcolor: "action.hover", px: 4, py: 1.5 }}>
            {transactions && transactions.length > 0 ? (
              transactions.map((tx) => (
                <Box key={tx.id} sx={{ display: "flex", gap: 2, py: 0.5, alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ width: 90 }}>
                    {new Date(tx.date).toLocaleDateString()}
                  </Typography>
                  <Chip
                    label={tx.type.replace("_", " ")}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.6875rem", height: 18 }}
                  />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {fmt(tx.amount)}
                  </Typography>
                  {tx.notes && (
                    <Typography variant="caption" color="text.secondary">
                      · {tx.notes}
                    </Typography>
                  )}
                </Box>
              ))
            ) : (
              <Typography variant="caption" color="text.secondary">
                No transactions logged
              </Typography>
            )}
          </Box>
        </Collapse>
      </TableCell>
    </TableRow>
  );
}
