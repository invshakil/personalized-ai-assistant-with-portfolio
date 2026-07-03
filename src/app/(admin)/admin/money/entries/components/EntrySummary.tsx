import { Box, Card, Chip, Typography } from "@mui/material";
import { fmtCurrency } from "../../format";

interface CurrencyTotal {
  currency: string;
  income: number;
  expense: number;
  net: number;
}

interface EntrySummaryProps {
  entriesCount: number;
  totalsByCurrency: CurrencyTotal[];
}

export default function EntrySummary({ entriesCount, totalsByCurrency }: EntrySummaryProps) {
  if (entriesCount === 0 || totalsByCurrency.length === 0) return null;

  return (
    <Card
      sx={{
        bgcolor: "background.paper",
        px: 2,
        py: 1.25,
        mb: 2,
        display: "flex",
        alignItems: "center",
        gap: 3,
        flexWrap: "wrap",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {entriesCount} {entriesCount === 1 ? "entry" : "entries"}
      </Typography>
      {totalsByCurrency.map((t) => (
        <Box key={t.currency} sx={{ display: "flex", gap: 3, alignItems: "center" }}>
          {totalsByCurrency.length > 1 && (
            <Chip size="small" label={t.currency} variant="outlined" sx={{ height: 20 }} />
          )}
          {t.income > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Income
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                +{fmtCurrency(t.income, t.currency)}
              </Typography>
            </Box>
          )}
          {t.expense > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Expense
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                −{fmtCurrency(t.expense, t.currency)}
              </Typography>
            </Box>
          )}
          {t.income > 0 && t.expense > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Net
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, color: t.net >= 0 ? "success.main" : "error.main" }}
              >
                {t.net >= 0 ? "+" : "−"}
                {fmtCurrency(Math.abs(t.net), t.currency)}
              </Typography>
            </Box>
          )}
        </Box>
      ))}
    </Card>
  );
}
