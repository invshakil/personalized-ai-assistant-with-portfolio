import { Box, Button, Card, Typography } from "@mui/material";
import { SwapHoriz } from "@mui/icons-material";
import type { TripWalletSummary } from "@/types";
import { fmt, fmtCurrency } from "../../format";

interface Props {
  wallet: TripWalletSummary | null;
  hasWalletAccount: boolean;
  onFund: () => void;
}

function Line({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
        {sub && <span style={{ opacity: 0.6, fontWeight: 400 }}> {sub}</span>}
      </Typography>
    </Box>
  );
}

export default function TripWalletCard({ wallet, hasWalletAccount, onFund }: Props) {
  return (
    <Card variant="outlined" sx={{ p: 2, flex: "1 1 320px", minWidth: 300 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Trip wallet
        </Typography>
        {hasWalletAccount && (
          <Button size="small" startIcon={<SwapHoriz />} onClick={onFund}>
            Fund
          </Button>
        )}
      </Box>
      {!hasWalletAccount ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No wallet account set. Add a local-currency account and select it as this trip&apos;s
          wallet (Edit trip) to convert cash and track leftover foreign money.
        </Typography>
      ) : wallet ? (
        <>
          <Line
            label="Funded"
            value={fmtCurrency(wallet.fundedLocal, wallet.currency)}
            sub={`(${fmt(wallet.fundedBdt)})`}
          />
          <Line label="Spent" value={fmtCurrency(wallet.spentLocal, wallet.currency)} />
          <Line
            label="Leftover"
            value={fmtCurrency(wallet.balanceLocal, wallet.currency)}
            sub={wallet.balanceBdt != null ? `≈ ${fmt(wallet.balanceBdt)}` : undefined}
          />
        </>
      ) : (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Loading…
        </Typography>
      )}
    </Card>
  );
}
