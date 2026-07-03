import { Box, Chip } from "@mui/material";
import type { ImportPreviewResult } from "@/lib/api/money";

interface PreviewSummaryChipsProps {
  preview: ImportPreviewResult;
}

/** Row/duplicate/error counts for the previewed CSV. */
export default function PreviewSummaryChips({ preview }: PreviewSummaryChipsProps) {
  return (
    <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
      <Chip size="small" label={`${preview.totalRows} rows`} />
      <Chip size="small" color="success" label={`${preview.validRows} ready`} />
      <Chip size="small" color="warning" label={`${preview.duplicateRows} duplicates`} />
      <Chip size="small" color="error" label={`${preview.errorRows} errors`} />
      {preview.newCategories.length > 0 && (
        <Chip
          size="small"
          variant="outlined"
          label={`${preview.newCategories.length} new categories`}
        />
      )}
    </Box>
  );
}
