import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { ImportMapping, ImportPreviewResult } from "@/lib/api/money";

/** Owns the preview/commit lifecycle for a mapped CSV file: running the server-side
 * preview, tracking the duplicate-inclusion toggle, and committing the import. */
export function useImportPreview(onCommitted: (importedCount: number, skipped: number) => void) {
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const resetPreview = () => {
    setPreview(null);
  };

  const runPreview = async (file: File | null, mapping: ImportMapping) => {
    if (!file) return;
    setPreviewing(true);
    clearMessages();
    try {
      setPreview(await moneyApi.previewImport(file, mapping));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const runImport = async (file: File | null, mapping: ImportMapping) => {
    if (!file) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await moneyApi.commitImport(file, mapping, includeDuplicates);
      setSuccess(`Imported ${res.imported} entries (${res.skipped} skipped).`);
      setPreview(null);
      onCommitted(res.imported, res.skipped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  return {
    preview,
    previewing,
    committing,
    includeDuplicates,
    setIncludeDuplicates,
    error,
    success,
    clearMessages,
    resetPreview,
    runPreview,
    runImport,
  };
}
