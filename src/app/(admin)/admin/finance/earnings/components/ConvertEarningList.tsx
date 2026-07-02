import { Box, Checkbox, Typography } from "@mui/material";
import type { EarningRow } from "../../types";
import { fmtCurrency, fmtDate } from "../../format";

interface ConvertEarningListProps {
  earnings: EarningRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

export default function ConvertEarningList({
  earnings,
  selected,
  onToggle,
}: ConvertEarningListProps) {
  return (
    <>
      <Typography variant="caption" color="text.secondary">
        Earnings to convert
      </Typography>
      <Box
        sx={{
          maxHeight: 200,
          overflowY: "auto",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          mb: 2,
          mt: 0.5,
        }}
      >
        {earnings.map((e) => (
          <Box
            key={e.id}
            sx={{
              display: "flex",
              alignItems: "center",
              px: 1,
              py: 0.25,
              borderBottom: 1,
              borderColor: "divider",
              "&:last-of-type": { borderBottom: 0 },
            }}
          >
            <Checkbox size="small" checked={selected.has(e.id)} onChange={() => onToggle(e.id)} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {e.sourceName} · {fmtCurrency(e.originalAmount, e.currency)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {fmtDate(e.date)}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </>
  );
}
