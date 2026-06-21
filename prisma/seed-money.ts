// Money Manager starter seed — common personal income/expense categories so the
// ledger is usable right away. Idempotent (upsert by unique [name, kind]); safe
// to re-run. Accounts and people are personal, so those are left for you to add.
//
//   npm run seed:money
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient, MoneyCategoryKind } from "@prisma/client";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const db = new PrismaClient();

const EXPENSE = [
  "Groceries",
  "Utilities",
  "Rent",
  "Transport",
  "Dining",
  "Health",
  "Education",
  "Shopping",
  "Mobile & Internet",
  "Household",
  "Entertainment",
  "Family Expense",
  "Payments to People",
];
const INCOME = ["Salary", "Gift", "Other Income", "Repayments from People"];

async function main() {
  const rows: { name: string; kind: MoneyCategoryKind }[] = [
    ...EXPENSE.map((name) => ({ name, kind: MoneyCategoryKind.EXPENSE })),
    ...INCOME.map((name) => ({ name, kind: MoneyCategoryKind.INCOME })),
  ];
  for (const r of rows) {
    await db.moneyCategory.upsert({
      where: { name_kind: { name: r.name, kind: r.kind } },
      update: {},
      create: r,
    });
  }
  console.log(`✓ Money Manager: ${rows.length} starter categories ensured.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
