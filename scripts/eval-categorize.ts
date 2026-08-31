// Accuracy eval for CSV import categorisation.
//
// This is the thing that turns "the suggestions feel decent" into a number.
// It runs REAL model calls against a fixed fixture, so:
//   • It costs money. It is a script, never part of `npm test`.
//   • The fixture is fixed on purpose — an eval whose expected answers drift
//     with the dev database measures nothing.
//
//   npm run eval:categorize
//
// Reports precision (of the suggestions it made, how many were right), coverage
// (how many lines it was willing to answer at all), and every miss, so a prompt
// or model change can be judged rather than guessed at.
import { existsSync, readFileSync } from "node:fs";
import { MoneyCategoryKind } from "@prisma/client";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const E = MoneyCategoryKind.EXPENSE;
const I = MoneyCategoryKind.INCOME;

/** The vocabulary the model must choose from. */
const CATEGORIES = [
  { name: "Groceries", kind: E },
  { name: "Transport", kind: E },
  { name: "Utilities", kind: E },
  { name: "Dining Out", kind: E },
  { name: "Mobile & Internet", kind: E },
  { name: "Health", kind: E },
  { name: "Shopping", kind: E },
  { name: "Rent", kind: E },
  { name: "Salary", kind: I },
  { name: "Freelance Income", kind: I },
  { name: "Refunds", kind: I },
];

/** How the user has filed things before — the few-shot signal. */
const EXAMPLES = [
  "DEBIT | MEENA BAZAR GULSHAN -> Groceries",
  "DEBIT | UBER *TRIP BD -> Transport",
  "DEBIT | GRAMEENPHONE RECHARGE -> Mobile & Internet",
  "DEBIT | DESCO BILL PAYMENT -> Utilities",
  "CREDIT | SALARY CREDIT JULY -> Salary",
];

type Direction = "CREDIT" | "DEBIT";

/**
 * Golden cases. `expect: null` means "no confident answer is the right answer" —
 * an opaque reference line the model should decline rather than guess at.
 */
const CASES: { description: string; direction: Direction; expect: string | null }[] = [
  { description: "SHWAPNO SUPERSTORE DHANMONDI", direction: "DEBIT", expect: "Groceries" },
  { description: "AGORA LTD BANANI", direction: "DEBIT", expect: "Groceries" },
  { description: "PATHAO RIDES BD", direction: "DEBIT", expect: "Transport" },
  { description: "UBER *TRIP HELP.UBER.COM", direction: "DEBIT", expect: "Transport" },
  { description: "TITAS GAS PREPAID TOPUP", direction: "DEBIT", expect: "Utilities" },
  { description: "DPDC ELECTRICITY BILL", direction: "DEBIT", expect: "Utilities" },
  { description: "ROBI AXIATA RECHARGE 300", direction: "DEBIT", expect: "Mobile & Internet" },
  { description: "LINK3 BROADBAND MONTHLY", direction: "DEBIT", expect: "Mobile & Internet" },
  { description: "SULTANS DINE GULSHAN", direction: "DEBIT", expect: "Dining Out" },
  { description: "STAR KABAB & RESTAURANT", direction: "DEBIT", expect: "Dining Out" },
  { description: "LAZZ PHARMA LTD", direction: "DEBIT", expect: "Health" },
  { description: "POPULAR DIAGNOSTIC CENTRE", direction: "DEBIT", expect: "Health" },
  { description: "DARAZ ONLINE ORDER", direction: "DEBIT", expect: "Shopping" },
  { description: "ARONG DHANMONDI", direction: "DEBIT", expect: "Shopping" },
  { description: "HOUSE RENT TRANSFER AUG", direction: "DEBIT", expect: "Rent" },
  { description: "SALARY CREDIT AUGUST 2026", direction: "CREDIT", expect: "Salary" },
  { description: "UPWORK ESCROW RELEASE", direction: "CREDIT", expect: "Freelance Income" },
  { description: "DARAZ ORDER REFUND", direction: "CREDIT", expect: "Refunds" },
  // Opaque lines — declining is the correct behaviour.
  { description: "TRF 8829301natio", direction: "DEBIT", expect: null },
  { description: "REF 00219388211", direction: "DEBIT", expect: null },
];

const pct = (n: number, d: number) => (d === 0 ? "—" : `${((n / d) * 100).toFixed(1)}%`);

async function main() {
  // Imported here, not at the top: these pull in the Prisma singleton, which
  // reads DATABASE_URL at construction — so the env has to be loaded first.
  const { categorizeWith, suggestionKey } = await import("@/services/money/categorize");
  const { getUsageSummary } = await import("@/services/ai/usage");

  const before = await getUsageSummary();

  console.log(`Evaluating ${CASES.length} cases against ${CATEGORIES.length} categories…\n`);
  const got = await categorizeWith(
    CASES.map((c) => ({ description: c.description, direction: c.direction })),
    CATEGORIES,
    EXAMPLES
  );

  if (got.size === 0) {
    console.error(
      "No suggestions returned at all. Check that a provider is active and has a key\n" +
        "(Settings → AI), and that the monthly budget is not already spent."
    );
    process.exit(1);
  }

  let correct = 0;
  let wrong = 0;
  let declined = 0;
  let correctlyDeclined = 0;
  const misses: string[] = [];

  for (const c of CASES) {
    const hit = got.get(suggestionKey(c.description, c.direction));
    if (!hit) {
      declined++;
      if (c.expect === null) correctlyDeclined++;
      else misses.push(`  DECLINED  ${c.description}\n            expected ${c.expect}`);
      continue;
    }
    if (hit.categoryName === c.expect) {
      correct++;
    } else {
      wrong++;
      misses.push(
        `  WRONG     ${c.description}\n            got ${hit.categoryName} ` +
          `(${Math.round(hit.confidence * 100)}%), expected ${c.expect ?? "no answer"}`
      );
    }
  }

  const answered = correct + wrong;
  console.log("─".repeat(64));
  console.log(
    `Answered     ${answered}/${CASES.length}   (coverage ${pct(answered, CASES.length)})`
  );
  console.log(`Correct      ${correct}/${answered}   (precision ${pct(correct, answered)})`);
  console.log(`Wrong        ${wrong}`);
  console.log(`Declined     ${declined}  — ${correctlyDeclined} of them correctly`);
  console.log("─".repeat(64));

  if (misses.length) {
    console.log("\nMisses:");
    for (const m of misses) console.log(m);
  }

  const after = await getUsageSummary();
  const spent = after.monthToDate - before.monthToDate;
  console.log(`\nThis run cost $${spent.toFixed(5)}.`);
  const feature = after.byFeature.find((f) => f.feature === "import_categorize");
  if (feature) {
    console.log(
      `Categorisation month-to-date: $${feature.costUsd.toFixed(5)} over ${feature.calls} calls.`
    );
  }

  // Non-zero exit on a wrong answer so this can gate a prompt change; a
  // declined-but-answerable line is a coverage regression, not a correctness one.
  process.exit(wrong > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
