import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import type { ImportPreviewResult } from "@/lib/api/money";
import PreviewSummaryChips from "./PreviewSummaryChips";
import PreviewTable from "./PreviewTable";

interface ImportPreviewPanelProps {
  preview: ImportPreviewResult;
  includeDuplicates: boolean;
  onIncludeDuplicatesChange: (v: boolean) => void;
  committing: boolean;
  onImport: () => void;
}

/** Step 3 of the import wizard: preview summary, row table, and the commit action. */
export default function ImportPreviewPanel({
  preview,
  includeDuplicates,
  onIncludeDuplicatesChange,
  committing,
  onImport,
}: ImportPreviewPanelProps) {
  const importCount = includeDuplicates
    ? preview.validRows + preview.duplicateRows
    : preview.validRows;

  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          3 · Review &amp; import
        </Typography>
        <PreviewSummaryChips preview={preview} />
        <FormControlLabel
          control={
            <Checkbox
              checked={includeDuplicates}
              onChange={(e) => onIncludeDuplicatesChange(e.target.checked)}
            />
          }
          label="Also import rows flagged as duplicates"
        />
        <PreviewTable rows={preview.rows} />
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={onImport}
            disabled={committing || (preview.validRows === 0 && !includeDuplicates)}
          >
            {committing ? "Importing…" : `Import ${importCount} rows`}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
