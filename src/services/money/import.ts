// Money Manager — CSV import for historical spending. Maps CSV columns to
// ledger fields, previews (with duplicate detection), and commits as a reversible
// MoneyImportBatch (source=IMPORTED). Re-importing the same file is safe to
// review before committing; a committed batch can be deleted to roll back.
//
// Self-contained CSV parser (no dependency) — handles quoted fields, embedded
// commas, escaped double-quotes, and CRLF. Assumes a header row.
import { db } from "@/lib/db";
import { MoneyEntrySource } from "@prisma/client";
import { toNum, toIso } from "./_serializers";
import { ensureCategory } from "./categories";

// ─── CSV parsing ───────────────────────────────────────────────────────────--

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const records: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/^﻿/, ""); // strip BOM

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      // Skip fully-blank lines
      if (row.some((v) => v.trim() !== "")) records.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((v) => v.trim() !== "")) records.push(row);
  }

  const headers = (records.shift() ?? []).map((h) => h.trim());
  return { headers, rows: records };
}

// ─── Field coercion ──────────────────────────────────────────────────────────

function parseAmount(raw: string): number | null {
  const cleaned = (raw ?? "").replace(/[^0-9.\-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.abs(n) : null;
}

function parseDateValue(raw: string): Date | null {
  const v = (raw ?? "").trim();
  if (!v) return null;
  // ISO / RFC parse first
  const direct = new Date(v);
  if (!Number.isNaN(direct.getTime())) return direct;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = v.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, month - 1, day);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function inferDirection(raw: string | undefined): "CREDIT" | "DEBIT" | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (["credit", "income", "in", "deposit", "+", "cr"].includes(v)) return "CREDIT";
  if (["debit", "expense", "out", "withdrawal", "spend", "-", "dr"].includes(v)) return "DEBIT";
  return null;
}

// ─── Mapping + preview ─────────────────────────────────────────────────────--

export interface ImportMapping {
  date: string; // header name → date
  amount: string; // header name → amount
  direction?: string; // header name → direction (optional)
  defaultDirection?: "CREDIT" | "DEBIT"; // used when no direction column / unparseable
  category?: string; // header name → category name
  defaultCategory?: string; // fallback category name
  account?: string; // header name → account name (matched case-insensitively)
  defaultAccountId?: string; // fallback account id
  description?: string;
  notes?: string;
}

export interface ParsedImportRow {
  rowNumber: number;
  date: string | null; // ISO
  direction: "CREDIT" | "DEBIT" | null;
  amount: number | null;
  categoryName: string | null;
  accountName: string | null;
  description: string | null;
  notes: string | null;
  duplicate: boolean;
  error: string | null;
}

export interface ImportPreview {
  headers: string[];
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  newCategories: string[];
  rows: ParsedImportRow[];
}

async function existingKeySet(): Promise<Set<string>> {
  const rows = await db.moneyEntry.findMany({
    select: { date: true, amount: true, description: true },
  });
  const key = (date: string, amount: number, desc: string | null) =>
    `${date.slice(0, 10)}|${amount.toFixed(2)}|${(desc ?? "").trim().toLowerCase()}`;
  return new Set(rows.map((r) => key(toIso(r.date)!, toNum(r.amount), r.description)));
}

function rowKey(dateIso: string, amount: number, desc: string | null): string {
  return `${dateIso.slice(0, 10)}|${amount.toFixed(2)}|${(desc ?? "").trim().toLowerCase()}`;
}

async function mapRows(
  headers: string[],
  rows: string[][],
  mapping: ImportMapping
): Promise<{ parsed: ParsedImportRow[]; newCategories: Set<string> }> {
  const idx = (name?: string) => (name ? headers.indexOf(name) : -1);
  const dateI = idx(mapping.date);
  const amountI = idx(mapping.amount);
  const dirI = idx(mapping.direction);
  const catI = idx(mapping.category);
  const accI = idx(mapping.account);
  const descI = idx(mapping.description);
  const notesI = idx(mapping.notes);

  const existing = await existingKeySet();
  const knownCategories = new Set(
    (await db.moneyCategory.findMany({ select: { name: true } })).map((c) => c.name.toLowerCase())
  );
  const newCategories = new Set<string>();
  const seenInFile = new Set<string>();

  const parsed = rows.map((cells, i): ParsedImportRow => {
    const get = (j: number) => (j >= 0 ? (cells[j] ?? "").trim() : "");
    const date = dateI >= 0 ? parseDateValue(get(dateI)) : null;
    const amount = amountI >= 0 ? parseAmount(get(amountI)) : null;
    const direction =
      inferDirection(dirI >= 0 ? get(dirI) : undefined) ?? mapping.defaultDirection ?? null;
    const categoryName = (catI >= 0 ? get(catI) : "") || mapping.defaultCategory || null;
    const accountName = accI >= 0 ? get(accI) || null : null;
    const description = descI >= 0 ? get(descI) || null : null;
    const notes = notesI >= 0 ? get(notesI) || null : null;

    let error: string | null = null;
    if (!date) error = "invalid or missing date";
    else if (amount == null) error = "invalid or missing amount";
    else if (!direction) error = "missing direction (no column value and no default)";
    else if (!categoryName) error = "missing category (no column value and no default)";

    let duplicate = false;
    const dateIso = date ? date.toISOString() : null;
    if (!error && dateIso && amount != null) {
      const k = rowKey(dateIso, amount, description);
      duplicate = existing.has(k) || seenInFile.has(k);
      seenInFile.add(k);
    }
    if (!error && categoryName && !knownCategories.has(categoryName.toLowerCase())) {
      newCategories.add(categoryName);
    }

    return {
      rowNumber: i + 2, // +1 for header, +1 for 1-based
      date: dateIso,
      direction,
      amount,
      categoryName,
      accountName,
      description,
      notes,
      duplicate,
      error,
    };
  });

  return { parsed, newCategories };
}

export async function previewImport(text: string, mapping: ImportMapping): Promise<ImportPreview> {
  const { headers, rows } = parseCsv(text);
  const { parsed, newCategories } = await mapRows(headers, rows, mapping);
  return {
    headers,
    totalRows: parsed.length,
    validRows: parsed.filter((r) => !r.error && !r.duplicate).length,
    duplicateRows: parsed.filter((r) => r.duplicate && !r.error).length,
    errorRows: parsed.filter((r) => r.error).length,
    newCategories: Array.from(newCategories),
    rows: parsed,
  };
}

// ─── Commit + rollback ─────────────────────────────────────────────────────--

export interface CommitImportInput {
  fileName: string;
  text: string;
  mapping: ImportMapping;
  includeDuplicates?: boolean; // default false — skip rows flagged as duplicates
}

export async function commitImport(
  input: CommitImportInput
): Promise<{ batchId: string; imported: number; skipped: number }> {
  const { headers, rows } = parseCsv(input.text);
  const { parsed } = await mapRows(headers, rows, input.mapping);

  const toInsert = parsed.filter((r) => !r.error && (input.includeDuplicates || !r.duplicate));
  const skipped = parsed.length - toInsert.length;

  // Resolve account names → ids (case-insensitive), with a default fallback.
  const accounts = await db.moneyAccount.findMany({ select: { id: true, name: true } });
  const accountByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]));

  // Resolve categories up front (ensure they exist with the right kind).
  const catCache = new Map<string, string>();
  const catKeyOf = (name: string, kind: "INCOME" | "EXPENSE") => `${kind}:${name.toLowerCase()}`;
  for (const r of toInsert) {
    const kind = r.direction === "CREDIT" ? "INCOME" : "EXPENSE";
    const key = catKeyOf(r.categoryName!, kind);
    if (!catCache.has(key)) catCache.set(key, await ensureCategory(r.categoryName!, kind));
  }

  const batch = await db.moneyImportBatch.create({
    data: {
      fileName: input.fileName,
      rowCount: toInsert.length,
      mapping: input.mapping as unknown as object,
    },
  });

  if (toInsert.length > 0) {
    await db.moneyEntry.createMany({
      data: toInsert.map((r) => {
        const kind = r.direction === "CREDIT" ? "INCOME" : "EXPENSE";
        const accountId = r.accountName
          ? (accountByName.get(r.accountName.toLowerCase()) ??
            input.mapping.defaultAccountId ??
            null)
          : (input.mapping.defaultAccountId ?? null);
        return {
          date: new Date(r.date!),
          direction: r.direction!,
          amount: r.amount!,
          categoryId: catCache.get(catKeyOf(r.categoryName!, kind))!,
          accountId,
          description: r.description,
          notes: r.notes,
          source: MoneyEntrySource.IMPORTED,
          importBatchId: batch.id,
        };
      }),
    });
  }

  return { batchId: batch.id, imported: toInsert.length, skipped };
}

export async function listImportBatches() {
  const batches = await db.moneyImportBatch.findMany({
    orderBy: { importedAt: "desc" },
    include: { _count: { select: { entries: true } } },
  });
  return batches.map((b) => ({
    id: b.id,
    fileName: b.fileName,
    rowCount: b.rowCount,
    importedAt: toIso(b.importedAt)!,
    currentEntryCount: b._count.entries,
  }));
}

export async function deleteImportBatch(batchId: string) {
  // Remove the imported entries, then the batch. Reverses a committed import.
  const deleted = await db.moneyEntry.deleteMany({ where: { importBatchId: batchId } });
  await db.moneyImportBatch.delete({ where: { id: batchId } });
  return { deleted: true, removedEntries: deleted.count };
}
