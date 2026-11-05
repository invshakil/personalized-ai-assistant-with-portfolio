import { Box, Card, CardContent, Typography, TextField, InputAdornment } from "@mui/material";
import { CreditCard as CreditCardIcon } from "lucide-react";
import NumberField from "@/components/admin/NumberField";
import type { BudgetFormState } from "../hooks/useAiBudget";
import CreditSummaryLine from "./CreditSummaryLine";
import type { CreditSummary } from "@/services/ai/types";

interface CreditCardProps {
  credit: CreditSummary | null;
  form: BudgetFormState;
  onChange: (patch: Partial<BudgetFormState>) => void;
}

/**
 * Prepaid credit tracker. The provider's API exposes no balance or expiry, so
 * the user copies the Console figures here; the app then subtracts its own
 * recorded spend to estimate what is left. Saved with the budget button below.
 */
export default function CreditCard({ credit, form, onChange }: CreditCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <CreditCardIcon size={17} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Prepaid credit
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          The provider does not expose your balance over the API. Enter the balance and expiry shown
          in its Console (Billing) and the date you read them; the remaining amount below subtracts
          the spend recorded here since that date. Update it whenever you top up.
        </Typography>

        <CreditSummaryLine credit={credit} />

        <Box sx={{ display: "flex", gap: 2, mt: 2, flexWrap: "wrap" }}>
          <NumberField
            size="small"
            label="Balance in Console"
            min={0}
            value={form.creditBalance}
            onChange={(creditBalance) => onChange({ creditBalance })}
            placeholder="Not tracked"
            slotProps={{
              input: { startAdornment: <InputAdornment position="start">$</InputAdornment> },
            }}
            sx={{ width: 180 }}
          />
          <TextField
            size="small"
            type="date"
            label="As of"
            value={form.creditAsOf}
            onChange={(e) => onChange({ creditAsOf: e.target.value })}
            helperText="Defaults to today"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 180 }}
          />
          <TextField
            size="small"
            type="date"
            label="Expires on"
            value={form.creditExpiresAt}
            onChange={(e) => onChange({ creditExpiresAt: e.target.value })}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 180 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
