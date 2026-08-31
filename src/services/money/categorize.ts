// AI-assisted categorisation for the CSV importer.
//
// A bank export has a description column and no category, so before this the
// only options were mapping a category column that doesn't exist or applying
// one `defaultCategory` to the whole file. This maps each distinct description
// onto a category the user already uses.
//
// Three things keep it honest:
//   • It only ever *suggests*. The preview table shows every suggestion with its
//     confidence, and nothing is written until the user commits the import.
//   • It picks from the user's existing categories, few-shot prompted with their
//     own recent (description → category) decisions — so it matches how they
//     actually file things rather than inventing a taxonomy.
//   • It degrades to nothing. If AI is unconfigured, over budget, or failing,
//     the import still runs exactly as it did before.
import { db } from "@/lib/db";
import { MoneyCategoryKind } from "@prisma/client";
import { tryAiTask } from "@/services/ai/task";

/** How many past decisions to show the model as examples of the user's filing. */
const EXAMPLE_COUNT = 60;
/** Descriptions per model call — keeps each request small and cache-friendly. */
const BATCH_SIZE = 100;
/**
 * Hard ceiling on distinct descriptions we will categorise for one file. A CSV
 * with more unique descriptions than this is almost certainly not a statement,
 * and the point of the cap is that a mis-mapped column can never turn into an
 * unbounded bill.
 */
const MAX_DESCRIPTIONS = 600;
/**
 * Below this the suggestion is withheld rather than shown as a weak guess.
 *
 * Set at "more likely than not". The eval found 0.35 too permissive: the model
 * scored an opaque reference line ("TRF 8829301natio") at exactly 0.35 — it was
 * honestly signalling a guess, and the threshold accepted it anyway. Confident
 * answers on real merchant names score far higher, so raising this costs no
 * coverage and stops the preview spending the user's attention on noise.
 */
const MIN_CONFIDENCE = 0.5;

export type EntryDirection = "CREDIT" | "DEBIT";

export interface CategorizeItem {
  description: string;
  direction: EntryDirection;
}

export interface CategorySuggestion {
  categoryName: string;
  /** 0–1, as reported by the model. Surfaced in the preview, never acted on alone. */
  confidence: number;
}

/** Stable key for a (description, direction) pair — descriptions repeat across both. */
export const suggestionKey = (description: string, direction: EntryDirection): string =>
  `${direction}|${description.trim().toLowerCase()}`;

const SYSTEM = [
  "You categorise personal bank-statement lines for a single user in Bangladesh.",
  "You are given the exact list of categories that user already uses, and recent examples of how they",
  "have categorised similar lines before. Match their existing habits — do not invent a new taxonomy.",
  "",
  "Rules:",
  "- categoryName MUST be copied exactly from the provided category list, including capitalisation.",
  "- Pick a category whose kind matches the line's direction: EXPENSE for DEBIT, INCOME for CREDIT.",
  "- confidence is 0 to 1. Use a low value when the description is opaque (a bare reference number,",
  "  an unfamiliar merchant); the user reviews everything and a weak guess wastes their attention.",
  "- Return exactly one assignment per input item, echoing its description and direction verbatim.",
].join("\n");

const SCHEMA = {
  type: "object",
  properties: {
    assignments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          description: { type: "string", description: "Echoed verbatim from the input item." },
          direction: { type: "string", enum: ["CREDIT", "DEBIT"] },
          categoryName: { type: "string", description: "Copied exactly from the category list." },
          confidence: { type: "number", description: "0 to 1." },
        },
        required: ["description", "direction", "categoryName", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["assignments"],
  additionalProperties: false,
} as const;

interface RawAssignment {
  description: string;
  direction: string;
  categoryName: string;
  confidence: number;
}

interface AssignmentsResult {
  assignments: RawAssignment[];
}

/** Category names the user actually has, indexed by kind then lowercased name. */
export type ValidCategories = Map<MoneyCategoryKind, Map<string, string>>;

/**
 * Index a category list for validation. Shared by the suggestion guard here and
 * by the importer's commit-time check, so both decide "is this a real category
 * of the right kind?" the same way.
 */
export function buildValidCategories(categories: CategoryOption[]): ValidCategories {
  const valid: ValidCategories = new Map([
    [MoneyCategoryKind.INCOME, new Map<string, string>()],
    [MoneyCategoryKind.EXPENSE, new Map<string, string>()],
  ]);
  for (const c of categories) valid.get(c.kind)?.set(c.name.toLowerCase(), c.name);
  return valid;
}

/** Resolve a category name for a direction, or undefined if it isn't legitimate. */
export function canonicalCategory(
  valid: ValidCategories,
  categoryName: string,
  direction: EntryDirection
): string | undefined {
  const kind = direction === "CREDIT" ? MoneyCategoryKind.INCOME : MoneyCategoryKind.EXPENSE;
  return valid.get(kind)?.get((categoryName ?? "").trim().toLowerCase());
}

/**
 * Turn a model response into suggestions we are willing to show.
 *
 * This is the guard, and it is deliberately separate from the call that
 * produces the response: the JSON Schema constrains the *shape* of what comes
 * back, never the *vocabulary*, so a well-formed answer can still name a
 * category that does not exist, file an expense under an income category, or
 * answer about a line nobody asked about. Everything that fails here is dropped
 * rather than corrected — a silently wrong category is worse than none.
 *
 * Pure: no DB, no network. Unit-tested in `__tests__/categorize.test.ts`.
 */
export function reconcileAssignments(
  assignments: RawAssignment[],
  valid: ValidCategories,
  askedKeys: ReadonlySet<string>
): Map<string, CategorySuggestion> {
  const out = new Map<string, CategorySuggestion>();
  for (const a of assignments ?? []) {
    if (a?.direction !== "CREDIT" && a?.direction !== "DEBIT") continue;

    // The category must exist AND belong to the kind the direction implies.
    const canonical = canonicalCategory(valid, a.categoryName, a.direction);
    if (!canonical) continue;

    const confidence = typeof a.confidence === "number" ? a.confidence : 0;
    if (!(confidence >= MIN_CONFIDENCE)) continue; // also rejects NaN

    // Only lines we actually asked about — a model that invents an extra row
    // must not be able to inject a category for something not in the file.
    const key = suggestionKey(a.description ?? "", a.direction);
    if (!askedKeys.has(key)) continue;

    out.set(key, { categoryName: canonical, confidence: Math.min(1, Math.max(0, confidence)) });
  }
  return out;
}

/** The user's own recent filing decisions — the few-shot examples. */
async function recentDecisions(): Promise<string[]> {
  const rows = await db.moneyEntry.findMany({
    where: { description: { not: null }, direction: { in: ["CREDIT", "DEBIT"] } },
    orderBy: { date: "desc" },
    take: EXAMPLE_COUNT,
    select: { description: true, direction: true, category: { select: { name: true } } },
  });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    const desc = (r.description ?? "").trim();
    if (!desc || !r.category) continue;
    const key = desc.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(`${r.direction} | ${desc} -> ${r.category.name}`);
  }
  return out;
}

/**
 * Suggest a category for each distinct (description, direction) pair.
 *
 * Returns a map keyed by {@link suggestionKey}. An empty map means "no
 * suggestions available" — never an error. Callers must treat a missing key as
 * "user decides", which is the pre-existing behaviour.
 */
export async function suggestCategories(
  items: CategorizeItem[]
): Promise<Map<string, CategorySuggestion>> {
  const categories = await db.moneyCategory.findMany({
    where: { isActive: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: { name: true, kind: true },
  });
  if (categories.length === 0) return new Map(); // nothing to choose from
  return categorizeWith(items, categories, await recentDecisions());
}

export interface CategoryOption {
  name: string;
  kind: MoneyCategoryKind;
}

/**
 * The model-calling core, with the category vocabulary and few-shot examples
 * passed in rather than read from the DB.
 *
 * Split out so the eval harness (`npm run eval:categorize`) can measure
 * accuracy against a fixed fixture instead of whatever happens to be in the
 * dev database — an eval whose expected answers drift with the data is not an
 * eval. Production callers use {@link suggestCategories}.
 */
export async function categorizeWith(
  items: CategorizeItem[],
  categories: CategoryOption[],
  examples: string[] = []
): Promise<Map<string, CategorySuggestion>> {
  const out = new Map<string, CategorySuggestion>();

  // Dedupe first: a statement repeats the same merchant dozens of times, and
  // the model should be asked once per distinct line, not once per row.
  const distinct = new Map<string, CategorizeItem>();
  for (const it of items) {
    const desc = it.description?.trim();
    if (!desc) continue;
    const key = suggestionKey(desc, it.direction);
    if (!distinct.has(key)) distinct.set(key, { description: desc, direction: it.direction });
  }
  if (distinct.size === 0 || distinct.size > MAX_DESCRIPTIONS) {
    if (distinct.size > MAX_DESCRIPTIONS) {
      console.warn(
        `[money/categorize] skipped: ${distinct.size} distinct descriptions exceeds the ${MAX_DESCRIPTIONS} cap.`
      );
    }
    return out;
  }
  if (categories.length === 0) return out;

  // Only names the user actually has are accepted back — the schema constrains
  // the shape, not the vocabulary, so this is where an invented category dies.
  const validByKind = buildValidCategories(categories);

  const categoryList = categories.map((c) => `- ${c.name} (${c.kind})`).join("\n");

  const batches: CategorizeItem[][] = [];
  const all = [...distinct.values()];
  for (let i = 0; i < all.length; i += BATCH_SIZE) batches.push(all.slice(i, i + BATCH_SIZE));

  for (const batch of batches) {
    const input = [
      "CATEGORIES THE USER HAS:",
      categoryList,
      "",
      examples.length ? "HOW THEY CATEGORISED RECENT LINES:" : "",
      examples.join("\n"),
      "",
      "CATEGORISE THESE LINES:",
      JSON.stringify(batch),
    ]
      .filter(Boolean)
      .join("\n");

    const res = await tryAiTask<AssignmentsResult>({
      feature: "import_categorize",
      purpose: "classify",
      system: SYSTEM,
      input,
      schema: SCHEMA as unknown as Record<string, unknown>,
    });
    // A failed batch costs that batch its suggestions, not the whole import.
    if (!res?.assignments) continue;

    const asked = new Set(batch.map((b) => suggestionKey(b.description, b.direction)));
    for (const [key, suggestion] of reconcileAssignments(res.assignments, validByKind, asked)) {
      out.set(key, suggestion);
    }
  }

  return out;
}
