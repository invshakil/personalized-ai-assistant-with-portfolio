import { Box, Chip, IconButton, Tooltip, Typography } from "@mui/material";
import { Trash2 } from "lucide-react";
import type { SubscriptionRateChange } from "../../types";
import { fmt, fmtMonth } from "../../format";

interface RateChangeListProps {
  rateChanges: SubscriptionRateChange[];
  busy: boolean;
  onDeleteRateChange: (rcId: string) => void;
}

export default function RateChangeList({
  rateChanges,
  busy,
  onDeleteRateChange,
}: RateChangeListProps) {
  if (rateChanges.length === 0) return null;

  return (
    <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
      {rateChanges.map((rc) => (
        <Box
          key={rc.id}
          sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: "0.85rem" }}
        >
          <Chip size="small" label={`from ${fmtMonth(rc.effectiveMonth)}`} variant="outlined" />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {fmt(rc.monthlyAmount)}
          </Typography>
          {rc.note && (
            <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
              {rc.note}
            </Typography>
          )}
          <Tooltip title="Remove price change">
            <IconButton
              size="small"
              color="error"
              onClick={() => onDeleteRateChange(rc.id)}
              disabled={busy}
              sx={{ ml: "auto" }}
            >
              <Trash2 size={13} />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
    </Box>
  );
}
