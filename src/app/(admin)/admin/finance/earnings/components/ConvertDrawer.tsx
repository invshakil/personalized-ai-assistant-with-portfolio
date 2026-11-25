import { Box, Drawer, Typography } from "@mui/material";
import type { ConvertDrawerState } from "../hooks/useConvertDrawer";
import ConvertDrawerBody from "./ConvertDrawerBody";

interface ConvertDrawerProps {
  state: ConvertDrawerState;
}

export default function ConvertDrawer({ state }: ConvertDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={state.convertOpen}
      onClose={state.closeConvert}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 460 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Convert currency
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Move money out of a foreign account at the actual rate — one transfer in the ledger. Into
          a BDT account, the pending income it covers is booked as income on the conversion date.
          Into another foreign account (e.g. EUR → USD), that income stays pending in the new
          currency.
        </Typography>

        <ConvertDrawerBody state={state} />
      </Box>
    </Drawer>
  );
}
