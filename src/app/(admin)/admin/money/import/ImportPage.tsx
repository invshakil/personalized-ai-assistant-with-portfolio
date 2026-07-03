"use client";

import { Box, Alert } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useImportAux } from "./hooks/useImportAux";
import { useCsvFile } from "./hooks/useCsvFile";
import { useImportPreview } from "./hooks/useImportPreview";
import { useDeleteImportBatch } from "./hooks/useDeleteImportBatch";
import CsvUploadCard from "./components/CsvUploadCard";
import ColumnMappingForm from "./components/ColumnMappingForm";
import ImportPreviewPanel from "./components/ImportPreviewPanel";
import PastImportsCard from "./components/PastImportsCard";

export default function ImportPage() {
  const aux = useImportAux();
  const csv = useCsvFile();
  const preview = useImportPreview(() => {
    csv.reset();
    aux.reload();
  });
  const del = useDeleteImportBatch(aux.reload);

  const canPreview = !!csv.file && !!csv.mapping.date && !!csv.mapping.amount;

  const handleFile = (f: File | null) => {
    csv.onFile(f);
    preview.resetPreview();
    preview.clearMessages();
  };

  return (
    <Box>
      <PageHeader
        title="Import CSV"
        subtitle="Bulk-import historical spending from a spreadsheet"
      />

      <CsvUploadCard fileRef={csv.fileRef} file={csv.file} onFile={handleFile} />

      {csv.headers.length > 0 && (
        <ColumnMappingForm
          headers={csv.headers}
          mapping={csv.mapping}
          onMappingChange={csv.setMapping}
          accounts={aux.accounts}
          canPreview={canPreview}
          previewing={preview.previewing}
          onPreview={() => preview.runPreview(csv.file, csv.mapping)}
        />
      )}

      {preview.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {preview.error}
        </Alert>
      )}
      {preview.success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {preview.success}
        </Alert>
      )}

      {preview.preview && (
        <ImportPreviewPanel
          preview={preview.preview}
          includeDuplicates={preview.includeDuplicates}
          onIncludeDuplicatesChange={preview.setIncludeDuplicates}
          committing={preview.committing}
          onImport={() => preview.runImport(csv.file, csv.mapping)}
        />
      )}

      <PastImportsCard batches={aux.batches} onDelete={del.requestDelete} />

      <ConfirmDialog
        open={!!del.dialog}
        title={del.dialog?.title ?? ""}
        message={del.dialog?.message ?? ""}
        confirmLabel={del.dialog?.confirmLabel}
        loading={del.loading}
        onConfirm={del.runConfirm}
        onClose={del.closeConfirm}
      />
    </Box>
  );
}
