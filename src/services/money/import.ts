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
import {
  buildValidCategories,
  canonicalCategory,
  suggestCategories,
  suggestionKey,
  type EntryDirection,
  type ValidCategories,
} from "./categorize";

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
  /**
   * Preview-only: ask the AI to suggest a category for rows that don't get one
   * from a column. Ignored on commit — see `aiCategories`.
   */
  aiCategorize?: boolean;
  /**
   * The suggestions the user actually reviewed, keyed by "DIRECTION|description"
   * (lowercased). The client sends back what the preview returned, so the commit
   * writes exactly what was on screen instead of re-running the model and
   * possibly getting different answers.
   */
  aiCategories?: Record<string, string>;
}

export interface ParsedImportRow {
  rowNumber: number;
  date: string | null; // ISO
  direction: "CREDIT" | "DEBIT" | null;
  amount: number | null;
  categoryName: string | null;
  /** Where categoryName came from — drives the "AI" chip in the preview table. */
  categorySource: "column" | "ai" | "default" | null;
  /** Model confidence 0–1, present only when categorySource is "ai". */
  categoryConfidence: number | null;
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
  /** How many rows were categorised by the model (0 when AI is off/unavailable). */
  aiSuggestedRows: number;
  /** The suggestion map to send back on commit so it writes what was reviewed. */
  aiCategories: Record<string, string>;
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
  mapping: ImportMapping,
  /** description|direction → category name. Empty when AI is off or unavailable. */
  suggestions: Map<string, { categoryName: string; confidence: number }> = new Map()
): Promise<{ parsed: ParsedImportRow[]; newCategories: Set<string>; aiRows: number }> {
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

  let aiRows = 0;

  const parsed = rows.map((cells, i): ParsedImportRow => {
    const get = (j: number) => (j >= 0 ? (cells[j] ?? "").trim() : "");
    const date = dateI >= 0 ? parseDateValue(get(dateI)) : null;
    const amount = amountI >= 0 ? parseAmount(get(amountI)) : null;
    const direction =
      inferDirection(dirI >= 0 ? get(dirI) : undefined) ?? mapping.defaultDirection ?? null;
    const accountName = accI >= 0 ? get(accI) || null : null;
    const description = descI >= 0 ? get(descI) || null : null;
    const notes = notesI >= 0 ? get(notesI) || null : null;

    // Precedence: an explicit column always wins (it is the user's own data),
    // then a per-row AI suggestion, then the blanket default. A suggestion is
    // more specific than "apply this category to the whole file", which is why
    // it outranks the default rather than only filling in for a missing one.
    const fromColumn = (catI >= 0 ? get(catI) : "") || null;
    const suggested =
      !fromColumn && description && direction
        ? suggestions.get(suggestionKey(description, direction as EntryDirection))
        : undefined;

    let categoryName: string | null;
    let categorySource: ParsedImportRow["categorySource"];
    let categoryConfidence: number | null = null;
    if (fromColumn) {
      categoryName = fromColumn;
      categorySource = "column";
    } else if (suggested) {
      categoryName = suggested.categoryName;
      categorySource = "ai";
      categoryConfidence = suggested.confidence;
      aiRows++;
    } else if (mapping.defaultCategory) {
      categoryName = mapping.defaultCategory;
      categorySource = "default";
    } else {
      categoryName = null;
      categorySource = null;
    }

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
      categorySource,
      categoryConfidence,
      accountName,
      description,
      notes,
      duplicate,
      error,
    };
  });

  return { parsed, newCategories, aiRows };
}

/**
 * The (description, direction) pairs worth asking the model about: rows that
 * carry a description and won't already get a category from a mapped column.
 * Reads the raw cells directly so the preview doesn't have to map twice.
 */
function categorizationCandidates(
  headers: string[],
  rows: string[][],
  mapping: ImportMapping
): { description: string; direction: EntryDirection }[] {
  const idx = (name?: string) => (name ? headers.indexOf(name) : -1);
  const descI = idx(mapping.description);
  if (descI < 0) return [];
  const catI = idx(mapping.category);
  const dirI = idx(mapping.direction);

  const out: { description: string; direction: EntryDirection }[] = [];
  for (const cells of rows) {
    const get = (j: number) => (j >= 0 ? (cells[j] ?? "").trim() : "");
    if (catI >= 0 && get(catI)) continue; // the column already answers this row
    const description = get(descI);
    if (!description) continue;
    const direction =
      inferDirection(dirI >= 0 ? get(dirI) : undefined) ?? mapping.defaultDirection ?? null;
    if (!direction) continue;
    out.push({ description, direction });
  }
  return out;
}

/**
 * Rebuild the suggestion map the preview returned, for use at commit time.
 *
 * `aiCategories` arrives from the client, so it is re-validated here against the
 * live category list rather than trusted. The preview-time guard
 * (`reconcileAssignments`) constrains what the *model* may propose; without this
 * second pass those constraints would hold only as long as the client chose to
 * replay the map faithfully, and a hand-edited request could name a category
 * that doesn't exist (creating it via `ensureCategory`) or file a DEBIT under an
 * income category. Same two rules as the preview guard, enforced server-side.
 *
 * Pure — unit-tested in `__tests__/categorize.test.ts`.
 */
export function validateSuggestionRecord(
  record: Record<string, string> | undefined,
  valid: ValidCategories
): Map<string, { categoryName: string; confidence: number }> {
  const map = new Map<string, { categoryName: string; confidence: number }>();
  if (!record || typeof record !== "object") return map;

  for (const [key, categoryName] of Object.entries(record)) {
    if (typeof categoryName !== "string" || !categoryName.trim()) continue;

    // The key encodes the direction the suggestion was made for; anything that
    // doesn't parse as one of ours was not produced by the preview.
    const direction: EntryDirection | null = key.startsWith("CREDIT|")
      ? "CREDIT"
      : key.startsWith("DEBIT|")
        ? "DEBIT"
        : null;
    if (!direction) continue;

    const canonical = canonicalCategory(valid, categoryName, direction);
    if (!canonical) continue;

    // Confidence isn't round-tripped — by commit time the user has reviewed the
    // suggestion, so it is a decision, not a guess.
    map.set(key, { categoryName: canonical, confidence: 1 });
  }
  return map;
}

export async function previewImport(text: string, mapping: ImportMapping): Promise<ImportPreview> {
  const { headers, rows } = parseCsv(text);

  // AI runs here and only here. The commit replays the map this returns, so
  // what gets written is what the user reviewed — not a second, possibly
  // different, model answer.
  let suggestions = new Map<string, { categoryName: string; confidence: number }>();
  if (mapping.aiCategorize) {
    suggestions = await suggestCategories(categorizationCandidates(headers, rows, mapping));
  }

  const { parsed, newCategories, aiRows } = await mapRows(headers, rows, mapping, suggestions);
  return {
    headers,
    totalRows: parsed.length,
    validRows: parsed.filter((r) => !r.error && !r.duplicate).length,
    duplicateRows: parsed.filter((r) => r.duplicate && !r.error).length,
    errorRows: parsed.filter((r) => r.error).length,
    newCategories: Array.from(newCategories),
    rows: parsed,
    aiSuggestedRows: aiRows,
    aiCategories: Object.fromEntries([...suggestions].map(([k, v]) => [k, v.categoryName])),
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
  const knownCategories = await db.moneyCategory.findMany({ select: { name: true, kind: true } });
  const { parsed } = await mapRows(
    headers,
    rows,
    input.mapping,
    validateSuggestionRecord(input.mapping.aiCategories, buildValidCategories(knownCategories))
  );

  const toInsert = parsed.filter((r) => !r.error && (input.includeDuplicates || !r.duplicate));
  const skipped = parsed.length - toInsert.length;

  // Resolve account names → ids (case-insensitive), with a default fallback.
  const accounts = await db.moneyAccount.findMany({
    select: { id: true, name: true, currency: true },
  });
  const accountByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]));
  const currencyByAccountId = new Map(accounts.map((a) => [a.id, a.currency]));

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
        // Imported rows take the currency of their account (BDT if none). fxRate
        // is left null (treated as 1) — set the rate later if you need foreign
        // imports converted in the BDT savings series.
        const currency = accountId ? (currencyByAccountId.get(accountId) ?? "BDT") : "BDT";
        return {
          date: new Date(r.date!),
          direction: r.direction!,
          amount: r.amount!,
          currency,
          fxRate: currency === "BDT" ? 1 : null,
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
  // Atomic: a failure between the two used to destroy the entries while leaving
  // the batch row pointing at nothing, with no way to re-run the undo.
  const deleted = await db.$transaction(async (tx) => {
    const removed = await tx.moneyEntry.deleteMany({ where: { importBatchId: batchId } });
    await tx.moneyImportBatch.delete({ where: { id: batchId } });
    return removed;
  });
  return { deleted: true, removedEntries: deleted.count };
}
