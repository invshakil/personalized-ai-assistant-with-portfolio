// Financial Tracker seeder — imports business finance data exported from
// "Financial Tracker.xlsx" (prisma/data/financial-tracker.json).
//
// Idempotent: guarded by an Earning-count check, so re-running on deploy is a
// no-op once seeded. Config (employees / income sources / expense categories)
// is upserted by unique name; ledger rows (earnings / payments / expenses) are
// bulk-inserted inside a transaction that rolls back on any error.
//
// Run standalone:  tsx prisma/seed-financial.ts
// Also invoked by: prisma/seed.ts (so `npm run seed` covers everything).

import { PrismaClient, RemittanceType, PaymentKind } from "@prisma/client";
import financialData from "./data/financial-tracker.json";

type Earning = {
  date: string;
  source: string;
  remittance: keyof typeof RemittanceType;
  amount: number;
  fiscalYear: string;
};
type EmployeePayment = {
  date: string;
  employee: string;
  type: keyof typeof PaymentKind;
  reference: string | null;
  amount: number;
  fiscalYear: string;
};
type BizExpense = {
  date: string;
  name: string;
  category: string;
  isRecurring: boolean;
  amount: number;
  fiscalYear: string;
};

export async function seedFinancial(db: PrismaClient): Promise<void> {
  const existing = await db.earning.count();
  if (existing > 0) {
    console.log("ℹ Financial Tracker data already seeded — skipping.");
    return;
  }

  console.log("→ Seeding Financial Tracker data for the first time...");

  // ── Config (upsert by unique name) ───────────────────────────────────────
  for (const name of financialData.employees) {
    await db.employee.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of financialData.incomeSources) {
    await db.incomeSource.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of financialData.expenseCategories) {
    await db.bizExpenseCategory.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(
    `  ✓ Config: ${financialData.employees.length} employees, ` +
      `${financialData.incomeSources.length} sources, ` +
      `${financialData.expenseCategories.length} categories`
  );

  // ── Resolve name → id maps ────────────────────────────────────────────────
  const employees = await db.employee.findMany();
  const sources = await db.incomeSource.findMany();
  const categories = await db.bizExpenseCategory.findMany();
  const employeeId = new Map(employees.map((e) => [e.name, e.id]));
  const sourceId = new Map(sources.map((s) => [s.name, s.id]));
  const categoryId = new Map(categories.map((c) => [c.name, c.id]));

  // ── Ledger rows (one transaction — rolls back on any error) ───────────────
  await db.$transaction(
    async (tx) => {
      await tx.earning.createMany({
        data: (financialData.earnings as Earning[]).map((e) => ({
          date: new Date(e.date),
          sourceId: sourceId.get(e.source)!,
          remittance: RemittanceType[e.remittance],
          amount: e.amount,
          fiscalYear: e.fiscalYear,
        })),
      });

      await tx.employeePayment.createMany({
        data: (financialData.employeePayments as EmployeePayment[]).map((p) => ({
          date: new Date(p.date),
          employeeId: employeeId.get(p.employee)!,
          type: PaymentKind[p.type],
          reference: p.reference,
          amount: p.amount,
          fiscalYear: p.fiscalYear,
        })),
      });

      await tx.bizExpense.createMany({
        data: (financialData.bizExpenses as BizExpense[]).map((b) => ({
          date: new Date(b.date),
          name: b.name,
          categoryId: categoryId.get(b.category)!,
          isRecurring: b.isRecurring,
          amount: b.amount,
          fiscalYear: b.fiscalYear,
        })),
      });
    },
    { timeout: 120_000 }
  );

  console.log(
    `  ✓ Ledger: ${financialData.earnings.length} earnings, ` +
      `${financialData.employeePayments.length} payments, ` +
      `${financialData.bizExpenses.length} business expenses`
  );
  console.log("✅ Financial Tracker seed complete.");
}

// Standalone runner — only executes when this file is run directly.
if (process.argv[1] && /seed-financial\.(ts|js)$/.test(process.argv[1])) {
  const db = new PrismaClient();
  seedFinancial(db)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
