// Money Manager scenario coverage. Integration tests that exercise the service
// layer against the dev database, plus pure CSV-parsing unit tests.
//
// Run: npm run test:money   (node:test via tsx — no extra dependency)
//
// All data is created under a unique TAG and removed in after(), so the suite
// is self-cleaning and never touches real ledger rows.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  createAccount,
  getAccountBalance,
  ensureCategory,
  createBeneficiary,
  createObligation,
  updateObligation,
  recordPayment,
  getBeneficiaryDetail,
  createEntry,
  recordTransfer,
  getEntries,
  parseCsv,
  previewImport,
} from "@/services/money";
import { moneyTools } from "@/services/ai/writeTools/money";
import { db } from "@/lib/db";

const TAG = `__MMTEST_${Date.now()}`;

let accA = "";
let accB = "";
let expCat = "";
let incCat = "";
let benId = "";
let oblId = "";

before(async () => {
  const a = await createAccount({ name: `${TAG} Wallet A`, type: "CASH", openingBalance: 100000 });
  const b = await createAccount({ name: `${TAG} Wallet B`, type: "BANK", openingBalance: 0 });
  accA = a.id;
  accB = b.id;
  expCat = await ensureCategory(`${TAG} Materials`, "EXPENSE");
  incCat = await ensureCategory(`${TAG} Salary`, "INCOME");
  const ben = await createBeneficiary({ name: `${TAG} Shop` });
  benId = ben.id;
  const obl = await createObligation({
    beneficiaryId: benId,
    type: "LOAN",
    direction: "OWED_BY_ME",
    amount: 30000,
    startDate: "2024-01-01",
  });
  oblId = obl.id;
});

after(async () => {
  // Entries first (FK), then the structures they reference.
  await db.moneyEntry.deleteMany({
    where: {
      OR: [
        { accountId: { in: [accA, accB] } },
        { transferAccountId: { in: [accA, accB] } },
        { beneficiaryId: benId },
      ],
    },
  });
  await db.beneficiaryObligation.deleteMany({ where: { beneficiaryId: benId } });
  await db.beneficiary.deleteMany({ where: { id: benId } });
  await db.moneyAccount.deleteMany({ where: { id: { in: [accA, accB] } } });
  await db.moneyCategory.deleteMany({ where: { id: { in: [expCat, incCat] } } });
  await db.$disconnect();
});

// ─── Account balance maths ──────────────────────────────────────────────────--

test("expense (DEBIT) reduces the source account balance", async () => {
  const before = await getAccountBalance(accA);
  await createEntry({
    date: "2024-02-01",
    direction: "DEBIT",
    amount: 5000,
    categoryId: expCat,
    accountId: accA,
  });
  assert.equal(await getAccountBalance(accA), before - 5000);
});

test("income (CREDIT) increases the account balance", async () => {
  const before = await getAccountBalance(accA);
  await createEntry({
    date: "2024-02-02",
    direction: "CREDIT",
    amount: 2000,
    categoryId: incCat,
    accountId: accA,
  });
  assert.equal(await getAccountBalance(accA), before + 2000);
});

test("transfer moves money between accounts and is typed TRANSFER", async () => {
  const aBefore = await getAccountBalance(accA);
  const bBefore = await getAccountBalance(accB);
  const entry = await recordTransfer({
    fromAccountId: accA,
    toAccountId: accB,
    amount: 10000,
    date: "2024-02-03",
  });
  assert.equal(entry.direction, "TRANSFER"); // excluded from income/expense
  assert.equal(await getAccountBalance(accA), aBefore - 10000);
  assert.equal(await getAccountBalance(accB), bBefore + 10000);
});

test("transfer refuses identical source and destination", async () => {
  await assert.rejects(
    recordTransfer({ fromAccountId: accA, toAccountId: accA, amount: 100, date: "2024-02-03" })
  );
});

// ─── People & Loans (the new linking flow) ──────────────────────────────────--

test("a payment linked to a due reduces its outstanding balance", async () => {
  const d0 = await getBeneficiaryDetail(benId);
  assert.equal(d0?.obligations[0].outstanding, 30000);

  await recordPayment({
    beneficiaryId: benId,
    amount: 10000,
    date: "2024-02-04",
    direction: "DEBIT",
    obligationId: oblId,
    accountId: accA,
  });

  const d1 = await getBeneficiaryDetail(benId);
  assert.equal(d1?.obligations[0].outstanding, 20000);
  // The payment is a real, queryable ledger entry tagged to the person.
  const tagged = await getEntries({ beneficiaryId: benId });
  assert.ok(tagged.some((e) => e.amount === 10000 && e.obligationId === oblId));
});

test("'add to due' grows the obligation; outstanding follows", async () => {
  // principal 30000, already 10000 paid → after +15000 principal = 45000.
  await updateObligation(oblId, { amount: 45000 });
  const d = await getBeneficiaryDetail(benId);
  assert.equal(d?.obligations[0].outstanding, 35000);
});

// ─── AI write tool ↔ service sync ───────────────────────────────────────────--

test("AI record_person_payment auto-applies a repayment to the lone open loan", async () => {
  const tool = moneyTools.find((t) => t.name === "record_person_payment");
  assert.ok(tool, "record_person_payment tool exists");
  const before = (await getBeneficiaryDetail(benId))?.obligations[0].outstanding ?? 0;
  // commit() takes raw model input and parses internally.
  const res = await tool!.commit({
    personName: `${TAG} Shop`,
    amount: 5000,
    date: "2024-02-05",
    direction: "DEBIT",
  });
  const after = (await getBeneficiaryDetail(benId))?.obligations[0].outstanding ?? 0;
  assert.equal(after, before - 5000); // loan actually went down
  assert.match(res.summary, /open loan/); // and the model is told so
});

// ─── CSV import parsing (pure) ──────────────────────────────────────────────--

test("parseCsv honours quoted fields containing commas", () => {
  const { headers, rows } = parseCsv(
    'Date,Amount,Description\n2024-01-01,"1,200.50","Bricks, sand"\n'
  );
  assert.deepEqual(headers, ["Date", "Amount", "Description"]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][1], "1,200.50");
  assert.equal(rows[0][2], "Bricks, sand"); // comma preserved inside quotes
});

test("previewImport parses amount/date/direction and surfaces new categories", async () => {
  const csv = `Date,Amount,Category,Description\n2024-03-01,"1,500",${TAG} Imported,${TAG} row one\n2024-03-02,2500,${TAG} Imported,${TAG} row two\n`;
  const preview = await previewImport(csv, {
    date: "Date",
    amount: "Amount",
    category: "Category",
    description: "Description",
    defaultDirection: "DEBIT",
  });
  assert.equal(preview.totalRows, 2);
  assert.equal(preview.errorRows, 0);
  assert.equal(preview.rows[0].amount, 1500); // thousands separator + currency stripped
  assert.equal(preview.rows[1].amount, 2500);
  assert.equal(preview.rows[0].direction, "DEBIT");
  assert.match(preview.rows[0].date ?? "", /^2024-03-01/);
  assert.ok(preview.newCategories.includes(`${TAG} Imported`));
});
