"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormControlLabel,
  Checkbox,
  Alert,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Upload, Trash2, FileText } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { moneyApi } from "@/lib/api/money";
import type { ImportMapping, ImportPreviewResult, ImportBatchRow } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import { fmt, fmtDate } from "../format";

const NONE = "__none__";

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [batches, setBatches] = useState<ImportBatchRow[]>([]);

  const [mapping, setMapping] = useState<ImportMapping>({ date: "", amount: "" });
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ImportBatchRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadAux = useCallback(async () => {
    const [acc, b] = await Promise.all([moneyApi.listAccounts(), moneyApi.listImportBatches()]);
    setAccounts(acc ?? []);
    setBatches(b ?? []);
  }, []);

  useEffect(() => {
    loadAux();
  }, [loadAux]);

  const onFile = async (f: File | null) => {
    setFile(f);
    setPreview(null);
    setError(null);
    setSuccess(null);
    if (!f) {
      setHeaders([]);
      return;
    }
    const text = await f.text();
    const firstLine = text.split(/\r?\n/)[0] ?? "";
    const cols = firstLine
      .replace(/^﻿/, "")
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    setHeaders(cols);
    // Best-effort auto-mapping by header name.
    const find = (re: RegExp) => cols.find((c) => re.test(c)) ?? "";
    setMapping({
      date: find(/date/i),
      amount: find(/amount|amt|value/i),
      direction: find(/type|direction|dr.?cr|debit|credit/i) || undefined,
      category: find(/categor/i) || undefined,
      account: find(/account|wallet|bank/i) || undefined,
      description: find(/desc|detail|narration|particular/i) || undefined,
      notes: find(/note/i) || undefined,
    });
  };

  const colSelect = (
    label: string,
    value: string | undefined,
    onChange: (v: string | undefined) => void,
    optional = true
  ) => (
    <FormControl size="small" fullWidth sx={{ mb: 2 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value ?? NONE}
        onChange={(e) => onChange(e.target.value === NONE ? undefined : e.target.value)}
      >
        {optional && <MenuItem value={NONE}>— none —</MenuItem>}
        {headers.map((h) => (
          <MenuItem key={h} value={h}>
            {h}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const runPreview = async () => {
    if (!file) return;
    setPreviewing(true);
    setError(null);
    setSuccess(null);
    try {
      setPreview(await moneyApi.previewImport(file, mapping));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setCommitting(true);
    setError(null);
    try {
      const res = await moneyApi.commitImport(file, mapping, includeDuplicates);
      setSuccess(`Imported ${res.imported} entries (${res.skipped} skipped).`);
      setFile(null);
      setHeaders([]);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";
      loadAux();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await moneyApi.deleteImportBatch(pendingDelete.id);
      setPendingDelete(null);
      loadAux();
    } finally {
      setDeleting(false);
    }
  };

  const canPreview = !!file && !!mapping.date && !!mapping.amount;

  return (
    <Box>
      <PageHeader
        title="Import CSV"
        subtitle="Bulk-import historical spending from a spreadsheet"
      />

      <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            1 · Choose a CSV file
          </Typography>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <Button
            variant="outlined"
            startIcon={<Upload size={16} />}
            onClick={() => fileRef.current?.click()}
          >
            {file ? file.name : "Select CSV"}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            First row must be column headers. Dates as YYYY-MM-DD (or DD/MM/YYYY). Amounts may
            include ৳ and commas.
          </Typography>
        </CardContent>
      </Card>

      {headers.length > 0 && (
        <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
              2 · Map columns
            </Typography>
            <Box
              sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}
            >
              <Box>
                {colSelect(
                  "Date column *",
                  mapping.date,
                  (v) => setMapping((m) => ({ ...m, date: v ?? "" })),
                  false
                )}
                {colSelect(
                  "Amount column *",
                  mapping.amount,
                  (v) => setMapping((m) => ({ ...m, amount: v ?? "" })),
                  false
                )}
                {colSelect("Direction column", mapping.direction, (v) =>
                  setMapping((m) => ({ ...m, direction: v }))
                )}
                <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Default direction</InputLabel>
                  <Select
                    label="Default direction"
                    value={mapping.defaultDirection ?? NONE}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        defaultDirection:
                          e.target.value === NONE
                            ? undefined
                            : (e.target.value as "CREDIT" | "DEBIT"),
                      }))
                    }
                  >
                    <MenuItem value={NONE}>— none —</MenuItem>
                    <MenuItem value="DEBIT">Expense (DEBIT)</MenuItem>
                    <MenuItem value="CREDIT">Income (CREDIT)</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box>
                {colSelect("Category column", mapping.category, (v) =>
                  setMapping((m) => ({ ...m, category: v }))
                )}
                <FormControl size="small" fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Default account</InputLabel>
                  <Select
                    label="Default account"
                    value={mapping.defaultAccountId ?? NONE}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        defaultAccountId: e.target.value === NONE ? undefined : e.target.value,
                      }))
                    }
                  >
                    <MenuItem value={NONE}>— none —</MenuItem>
                    {accounts.map((a) => (
                      <MenuItem key={a.id} value={a.id}>
                        {a.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {colSelect("Account column", mapping.account, (v) =>
                  setMapping((m) => ({ ...m, account: v }))
                )}
                {colSelect("Description column", mapping.description, (v) =>
                  setMapping((m) => ({ ...m, description: v }))
                )}
              </Box>
            </Box>
            <Button variant="contained" onClick={runPreview} disabled={!canPreview || previewing}>
              {previewing ? "Previewing…" : "Preview"}
            </Button>
            {!canPreview && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                Map at least Date and Amount.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {preview && (
        <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              3 · Review &amp; import
            </Typography>
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeDuplicates}
                  onChange={(e) => setIncludeDuplicates(e.target.checked)}
                />
              }
              label="Also import rows flagged as duplicates"
            />
            <TableContainer sx={{ maxHeight: 360, mb: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Dir</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.rows.slice(0, 100).map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell>{r.rowNumber}</TableCell>
                      <TableCell>{r.date ? fmtDate(r.date) : "—"}</TableCell>
                      <TableCell>{r.direction ?? "—"}</TableCell>
                      <TableCell align="right">{r.amount != null ? fmt(r.amount) : "—"}</TableCell>
                      <TableCell>{r.categoryName ?? "—"}</TableCell>
                      <TableCell>
                        {r.error ? (
                          <Chip size="small" color="error" label={r.error} variant="outlined" />
                        ) : r.duplicate ? (
                          <Chip size="small" color="warning" label="duplicate" variant="outlined" />
                        ) : (
                          <Chip size="small" color="success" label="ready" variant="outlined" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {preview.rows.length > 100 && (
              <Typography variant="caption" color="text.secondary">
                Showing first 100 of {preview.rows.length} rows. All valid rows will be imported.
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={runImport}
                disabled={committing || (preview.validRows === 0 && !includeDuplicates)}
              >
                {committing
                  ? "Importing…"
                  : `Import ${includeDuplicates ? preview.validRows + preview.duplicateRows : preview.validRows} rows`}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Past imports */}
      <Card sx={{ bgcolor: "background.paper" }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
            Past imports
          </Typography>
          {batches.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No imports yet.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Imported</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Rows
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Undo</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <FileText size={14} />
                        {b.fileName}
                      </Box>
                    </TableCell>
                    <TableCell>{fmtDate(b.importedAt)}</TableCell>
                    <TableCell align="right">{b.currentEntryCount}</TableCell>
                    <TableCell>
                      <Tooltip title="Delete this batch's entries (rollback)">
                        <IconButton size="small" color="error" onClick={() => setPendingDelete(b)}>
                          <Trash2 size={14} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingDelete}
        title="Roll back import"
        message={`Delete all ${pendingDelete?.currentEntryCount ?? ""} entries imported from "${pendingDelete?.fileName}"? This cannot be undone.`}
        confirmLabel="Delete entries"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </Box>
  );
}
