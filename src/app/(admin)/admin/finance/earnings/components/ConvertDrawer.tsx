import { Box, Drawer, Typography } from "@mui/material";
import type { MoneyAccountRow } from "@/types";
import type { EarningRow } from "../../types";
import ConvertDrawerBody from "./ConvertDrawerBody";

interface ConvertDrawerProps {
  open: boolean;
  onClose: () => void;
  pendingCurrencies: string[];
  convCurrency: string;
  onConvCurrencyChange: (cur: string) => void;
  convList: EarningRow[];
  convSelected: Set<string>;
  onToggleSelect: (id: string) => void;
  convFrom: string;
  onConvFromChange: (v: string) => void;
  convTo: string;
  onConvToChange: (v: string) => void;
  convDate: string;
  onConvDateChange: (v: string) => void;
  convToAmount: string;
  onConvToAmountChange: (v: string) => void;
  convRateLoading: boolean;
  fromAccountOptions: MoneyAccountRow[];
  toAccountOptions: MoneyAccountRow[];
  convTotalOriginal: number;
  convChosenCount: number;
  convRate: number;
  convToAmountNum: number;
  convVariance: number;
  convError: string | null;
  convSaving: boolean;
  convReady: boolean;
  onConvert: () => void;
}

export default function ConvertDrawer(props: ConvertDrawerProps) {
  const { open, onClose, ...bodyProps } = props;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 460 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Convert to BDT
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Realize foreign earnings at the actual rate. Posts one transfer (foreign account → BDT
          account); the received BDT is booked as income on the conversion date.
        </Typography>

        <ConvertDrawerBody {...bodyProps} />
      </Box>
    </Drawer>
  );
}
