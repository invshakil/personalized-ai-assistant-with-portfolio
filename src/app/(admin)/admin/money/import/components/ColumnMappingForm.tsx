import { Box, Card, CardContent, Typography, Button } from "@mui/material";
import type { ImportMapping } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import ColumnSelectField from "./ColumnSelectField";
import MappingDefaultsFields from "./MappingDefaultsFields";

interface ColumnMappingFormProps {
  headers: string[];
  mapping: ImportMapping;
  onMappingChange: (updater: (m: ImportMapping) => ImportMapping) => void;
  accounts: MoneyAccountRow[];
  canPreview: boolean;
  previewing: boolean;
  onPreview: () => void;
}

/** Step 2 of the import wizard: maps CSV columns to entry fields plus optional defaults. */
export default function ColumnMappingForm({
  headers,
  mapping,
  onMappingChange,
  accounts,
  canPreview,
  previewing,
  onPreview,
}: ColumnMappingFormProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
          2 · Map columns
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <ColumnSelectField
              label="Date column *"
              value={mapping.date}
              headers={headers}
              optional={false}
              onChange={(v) => onMappingChange((m) => ({ ...m, date: v ?? "" }))}
            />
            <ColumnSelectField
              label="Amount column *"
              value={mapping.amount}
              headers={headers}
              optional={false}
              onChange={(v) => onMappingChange((m) => ({ ...m, amount: v ?? "" }))}
            />
            <ColumnSelectField
              label="Direction column"
              value={mapping.direction}
              headers={headers}
              onChange={(v) => onMappingChange((m) => ({ ...m, direction: v }))}
            />
            <MappingDefaultsFields
              variant="direction"
              mapping={mapping}
              accounts={accounts}
              onMappingChange={onMappingChange}
            />
          </Box>
          <Box>
            <ColumnSelectField
              label="Category column"
              value={mapping.category}
              headers={headers}
              onChange={(v) => onMappingChange((m) => ({ ...m, category: v }))}
            />
            <MappingDefaultsFields
              variant="account"
              mapping={mapping}
              accounts={accounts}
              onMappingChange={onMappingChange}
            />
            <ColumnSelectField
              label="Account column"
              value={mapping.account}
              headers={headers}
              onChange={(v) => onMappingChange((m) => ({ ...m, account: v }))}
            />
            <ColumnSelectField
              label="Description column"
              value={mapping.description}
              headers={headers}
              onChange={(v) => onMappingChange((m) => ({ ...m, description: v }))}
            />
          </Box>
        </Box>
        <Button variant="contained" onClick={onPreview} disabled={!canPreview || previewing}>
          {previewing ? "Previewing…" : "Preview"}
        </Button>
        {!canPreview && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
            Map at least Date and Amount.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
