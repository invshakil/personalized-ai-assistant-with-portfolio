import { Box, IconButton, Tooltip } from "@mui/material";
import { FileDown, Send, Trash2 } from "lucide-react";

interface PaymentRowActionsProps {
  paymentId: string;
  onDelete: (pid: string, e: React.MouseEvent) => void;
  deleting: boolean;
}

export default function PaymentRowActions({
  paymentId,
  onDelete,
  deleting,
}: PaymentRowActionsProps) {
  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      <Tooltip title="Download receipt">
        <IconButton
          size="small"
          color="primary"
          component="a"
          href={`/api/admin/property/payments/${paymentId}/receipt`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <FileDown size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Download Tenant Copy (to send)">
        <IconButton
          size="small"
          color="info"
          component="a"
          href={`/api/admin/property/payments/${paymentId}/receipt?copy=tenant`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Send size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete payment">
        <IconButton
          size="small"
          color="error"
          disabled={deleting}
          onClick={(e) => onDelete(paymentId, e)}
        >
          <Trash2 size={14} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
