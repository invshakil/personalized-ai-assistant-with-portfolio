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
  getBeneficiaries,
  getBeneficiaryDetail,
  createEntry,
  recordTransfer,
  getEntries,
  parseCsv,
  previewImport,
  mergeCategories,
  getCategories,
  getPersonalSavings,
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
  // Sweep everything created under TAG — including entities the AI tools created.
  const accts = await db.moneyAccount.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  const bens = await db.beneficiary.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  const acctIds = accts.map((a) => a.id);
  const benIds = bens.map((b) => b.id);
  // Entries first (FK), then the structures they reference.
  await db.moneyEntry.deleteMany({
    where: {
      OR: [
        { accountId: { in: acctIds } },
        { transferAccountId: { in: acctIds } },
        { beneficiaryId: { in: benIds } },
      ],
    },
  });
  await db.beneficiaryObligation.deleteMany({ where: { beneficiaryId: { in: benIds } } });
  await db.beneficiary.deleteMany({ where: { id: { in: benIds } } });
  await db.moneyAccount.deleteMany({ where: { id: { in: acctIds } } });
  await db.moneyCategory.deleteMany({ where: { name: { startsWith: TAG } } });
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

test("transfer with a fee debits the source amount+fee and books the fee as an expense", async () => {
  const aBefore = await getAccountBalance(accA);
  const bBefore = await getAccountBalance(accB);
  const transfer = await recordTransfer({
    fromAccountId: accA,
    toAccountId: accB,
    amount: 10000,
    fee: 100,
    date: "2024-02-06",
  });
  // Source loses amount + fee; destination still receives the full amount.
  assert.equal(await getAccountBalance(accA), aBefore - 10100);
  assert.equal(await getAccountBalance(accB), bBefore + 10000);

  // The fee is a real EXPENSE DEBIT on the source, linked back to the transfer.
  const fee = await db.moneyEntry.findFirst({
    where: { feeForTransferId: transfer.id },
    include: { category: true },
  });
  assert.ok(fee, "a fee entry was created");
  assert.equal(fee!.direction, "DEBIT");
  assert.equal(Number(fee!.amount), 100);
  assert.equal(fee!.accountId, accA);
  assert.equal(fee!.category?.name, "Transfer Fee");
  assert.equal(fee!.category?.kind, "EXPENSE");
});

test("deleting a transfer cascades its fee entry away", async () => {
  const aBefore = await getAccountBalance(accA);
  const transfer = await recordTransfer({
    fromAccountId: accA,
    toAccountId: accB,
    amount: 5000,
    fee: 250,
    date: "2024-02-07",
  });
  assert.equal(await getAccountBalance(accA), aBefore - 5250);
  const fee = await db.moneyEntry.findFirstOrThrow({ where: { feeForTransferId: transfer.id } });

  await db.moneyEntry.delete({ where: { id: transfer.id } });
  // FK cascade removes the fee and the source balance is fully restored.
  assert.equal(await db.moneyEntry.findUnique({ where: { id: fee.id } }), null);
  assert.equal(await getAccountBalance(accA), aBefore);
});

test("AI record_money_transfer passes a fee through as a linked expense", async () => {
  const tool = moneyTools.find((t) => t.name === "record_money_transfer")!;
  const aBefore = await getAccountBalance(accA);
  const res = await tool.commit({
    fromAccountName: `${TAG} Wallet A`,
    toAccountName: `${TAG} Wallet B`,
    amount: 2000,
    fee: 50,
    date: "2024-02-08",
  });
  assert.equal(await getAccountBalance(accA), aBefore - 2050);
  assert.match(res.summary, /fee booked as expense/);
  const entry = res.data as { id: string };
  const fee = await db.moneyEntry.findFirstOrThrow({ where: { feeForTransferId: entry.id } });
  assert.equal(Number(fee.amount), 50);
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

test("overpaying one loan spills over to the person's other loans", async () => {
  // Three OWED_BY_ME loans: 20000 + 10000 + 30000 = 60000 owed.
  const ben = await createBeneficiary({ name: `${TAG} Spill Shop` });
  const mk = (amount: number) =>
    createObligation({
      beneficiaryId: ben.id,
      type: "LOAN",
      direction: "OWED_BY_ME",
      amount,
      startDate: "2024-01-01",
    });
  const o1 = await mk(20000);
  const o2 = await mk(10000);
  const o3 = await mk(30000);

  const pay = (obligationId: string, amount: number) =>
    recordPayment({
      beneficiaryId: ben.id,
      amount,
      date: "2024-02-10",
      direction: "DEBIT",
      obligationId,
    });

  // Pay 55000 total, overpaying loan #1 by 10000 (30000 against a 20000 loan).
  await pay(o1.id, 30000);
  await pay(o2.id, 10000);
  await pay(o3.id, 15000);

  // True net due = 60000 − 55000 = 5000. The old per-obligation clamp threw the
  // 10000 overpayment away and reported 15000.
  const detail = await getBeneficiaryDetail(ben.id);
  assert.equal(detail?.outstandingByMe, 5000);
  const listed = (await getBeneficiaries()).find((b) => b.id === ben.id);
  assert.equal(listed?.outstandingByMe, 5000); // list and detail agree
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

test("AI create_money_account creates an account with an opening balance", async () => {
  const tool = moneyTools.find((t) => t.name === "create_money_account")!;
  const res = await tool.commit({
    name: `${TAG} bKash`,
    type: "MOBILE_WALLET",
    openingBalance: 7000,
  });
  const acc = res.data as { id: string };
  assert.equal(await getAccountBalance(acc.id), 7000);
  await assert.rejects(tool.commit({ name: `${TAG} bKash`, type: "CASH" }), /already exists/);
});

test("AI create_person adds a beneficiary and rejects duplicates", async () => {
  const tool = moneyTools.find((t) => t.name === "create_person")!;
  await tool.commit({ name: `${TAG} Hardware Store`, relationship: "shop" });
  const people = await getBeneficiaries();
  assert.ok(people.some((p) => p.name === `${TAG} Hardware Store`));
  await assert.rejects(tool.commit({ name: `${TAG} Hardware Store` }), /already exists/);
});

test("AI create_person_loan then increase_person_loan track a running shop due", async () => {
  const personTool = moneyTools.find((t) => t.name === "create_person")!;
  const loanTool = moneyTools.find((t) => t.name === "create_person_loan")!;
  const incTool = moneyTools.find((t) => t.name === "increase_person_loan")!;
  const name = `${TAG} Sand Supplier`;

  await personTool.commit({ name });
  await loanTool.commit({ personName: name, amount: 12000, direction: "OWED_BY_ME" });
  let p = (await getBeneficiaries()).find((b) => b.name === name)!;
  assert.equal(p.outstandingByMe, 12000);

  // Bought more on the tab → due grows, no cash entry created.
  const res = await incTool.commit({ personName: name, amount: 3000 });
  p = (await getBeneficiaries()).find((b) => b.name === name)!;
  assert.equal(p.outstandingByMe, 15000);
  assert.match(res.summary, /now owe/);
});

// ─── Category merge (duplicate cleanup) ─────────────────────────────────────

test("merging a duplicate category moves its entries and deletes the source", async () => {
  const dupe = await ensureCategory(`${TAG} Materials Dupe`, "EXPENSE");
  await createEntry({
    date: "2024-04-01",
    direction: "DEBIT",
    amount: 700,
    categoryId: dupe,
    accountId: accA,
  });
  const targetBefore = await db.moneyEntry.count({ where: { categoryId: expCat } });

  const res = await mergeCategories({ sourceId: dupe, targetId: expCat });

  assert.equal(res.movedEntries, 1);
  assert.equal(res.sourceDeleted, true);
  assert.equal(await db.moneyEntry.count({ where: { categoryId: expCat } }), targetBefore + 1);
  assert.equal(await db.moneyCategory.count({ where: { id: dupe } }), 0);
});

test("merge with deleteSource:false empties the source but keeps it", async () => {
  const dupe = await ensureCategory(`${TAG} Materials Keep`, "EXPENSE");
  await createEntry({
    date: "2024-04-02",
    direction: "DEBIT",
    amount: 300,
    categoryId: dupe,
    accountId: accA,
  });

  const res = await mergeCategories({ sourceId: dupe, targetId: expCat, deleteSource: false });

  assert.equal(res.movedEntries, 1);
  assert.equal(res.sourceDeleted, false);
  const kept = (await getCategories()).find((c) => c.id === dupe);
  assert.equal(kept?.entryCount, 0);
});

test("a cross-kind merge is refused and moves nothing", async () => {
  const dupe = await ensureCategory(`${TAG} Materials Cross`, "EXPENSE");
  await createEntry({
    date: "2024-04-03",
    direction: "DEBIT",
    amount: 400,
    categoryId: dupe,
    accountId: accA,
  });

  await assert.rejects(() => mergeCategories({ sourceId: dupe, targetId: incCat }), /same kind/);
  // The rollback matters more than the message: the entry must still be here.
  assert.equal(await db.moneyEntry.count({ where: { categoryId: dupe } }), 1);
});

test("a same-kind merge leaves the savings totals untouched", async () => {
  // The point of the same-kind rule. getPersonalSavings only counts an entry
  // when CREDIT pairs with an INCOME category and DEBIT with an EXPENSE one, so
  // a cross-kind merge would silently drop rows from BOTH income and expense —
  // no error, just a quietly wrong savings number. Same-kind must be a no-op.
  const window = { from: "2024-05-01", to: "2024-05-31" };
  const dupe = await ensureCategory(`${TAG} Materials May`, "EXPENSE");
  await createEntry({
    date: "2024-05-15",
    direction: "DEBIT",
    amount: 1250,
    categoryId: dupe,
    accountId: accA,
  });

  const before = (await getPersonalSavings(window)).totals;
  // Guard against a vacuous pass: the new row must actually be in the window.
  assert.ok(before.expense >= 1250, "the test entry should be counted before the merge");

  await mergeCategories({ sourceId: dupe, targetId: expCat });
  const after = (await getPersonalSavings(window)).totals;

  assert.deepEqual(after, before);
});

test("merging a category into itself is refused", async () => {
  await assert.rejects(
    () => mergeCategories({ sourceId: expCat, targetId: expCat }),
    /different category/
  );
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
