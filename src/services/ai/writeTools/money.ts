// Money Manager write tools — personal ledger mutations (income, expense,
// transfer, person payment). Each delegates to src/services/money/ with no
// business logic here. Accounts and beneficiaries are resolved by name so the
// model can use natural-language references ("Cash", "bKash", "Mum").
import {
  listAccountsWithBalances,
  createEntry,
  updateEntry,
  deleteEntry,
  recordTransfer,
  getBeneficiaries,
  getBeneficiaryDetail,
  recordPayment,
  ensureCategory,
  getEntry,
} from "@/services/money";
import {
  write,
  type WriteToolDef,
  optStr,
  optNum,
  reqStr,
  reqNum,
  reqDate,
  optDate,
  reqEnum,
  optEnum,
  taka,
  schema,
  Str,
  Num,
  Enum,
} from "./shared";

// ─── Reference resolvers ──────────────────────────────────────────────────────

async function accountByName(name: string) {
  const accounts = await listAccountsWithBalances();
  const found = accounts.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (!found) {
    const names = accounts.map((a) => a.name).join(", ");
    throw new Error(`No account named "${name}". Available: ${names}`);
  }
  return found;
}

async function beneficiaryByName(name: string) {
  const people = await getBeneficiaries();
  const found = people.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!found) {
    const names = people.map((p) => p.name).join(", ");
    throw new Error(
      `No person named "${name}". Available: ${names}. Add them in People & Loans first.`
    );
  }
  return found;
}

const DIRECTIONS = ["CREDIT", "DEBIT"] as const;
const PAYMENT_DIRS = ["DEBIT", "CREDIT"] as const;

export const moneyTools: WriteToolDef[] = [
  // ─── Ledger entries ──────────────────────────────────────────────────────────

  write({
    name: "create_money_entry",
    description:
      "Add a personal income (CREDIT) or expense (DEBIT) ledger entry. " +
      "direction=CREDIT for money coming in, DEBIT for money going out. " +
      "categoryName is free-text — it will be created if it doesn't exist (INCOME for CREDIT, EXPENSE for DEBIT). " +
      "accountName must match an existing account (use get_account_balances to list them). " +
      "To move money between accounts (e.g. cash withdrawal) use record_money_transfer instead.",
    parameters: schema(
      {
        direction: Enum(DIRECTIONS, "CREDIT (income) or DEBIT (expense)"),
        amount: Num("Amount in BDT"),
        date: Str("Date YYYY-MM-DD"),
        categoryName: Str("Category name (created if needed, e.g. Groceries, Salary)"),
        accountName: Str("Account name, e.g. Cash, bKash (optional)"),
        description: Str("Short description (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["direction", "amount", "date", "categoryName"]
    ),
    parse: (i) => ({
      direction: reqEnum(i.direction, DIRECTIONS, "direction") as "CREDIT" | "DEBIT",
      amount: reqNum(i.amount, "amount"),
      date: reqDate(i.date, "date"),
      categoryName: reqStr(i.categoryName, "categoryName"),
      accountName: optStr(i.accountName),
      description: optStr(i.description) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const acct = a.accountName ? ` from ${a.accountName}` : "";
      const verb = a.direction === "CREDIT" ? "Record income" : "Record expense";
      return `${verb}: ${taka(a.amount)} — ${a.categoryName}${acct} on ${a.date}.`;
    },
    commit: async (a) => {
      const kind = a.direction === "CREDIT" ? "INCOME" : "EXPENSE";
      const categoryId = await ensureCategory(a.categoryName, kind);
      const accountId = a.accountName ? (await accountByName(a.accountName)).id : null;
      const entry = await createEntry({
        date: a.date,
        direction: a.direction,
        amount: a.amount,
        categoryId,
        accountId,
        description: a.description,
        notes: a.notes,
      });
      const acct = a.accountName ? ` → ${a.accountName}` : "";
      return {
        summary: `Recorded ${taka(a.amount)} ${a.direction === "CREDIT" ? "income" : "expense"} (${a.categoryName}${acct}).`,
        data: entry,
      };
    },
  }),

  write({
    name: "update_money_entry",
    description:
      "Correct an existing income or expense ledger entry. Pass the entry id (from list_money_entries) and only the fields to change. " +
      "Cannot edit TRANSFER entries — delete and re-create those.",
    parameters: schema(
      {
        id: Str("Entry id (from list_money_entries)"),
        direction: Enum(DIRECTIONS, "CREDIT or DEBIT (optional)"),
        amount: Num("New amount in BDT (optional)"),
        date: Str("New date YYYY-MM-DD (optional)"),
        categoryName: Str("New category name (optional)"),
        accountName: Str("New account name (optional — pass empty string to clear)"),
        description: Str("New description (optional)"),
        notes: Str("New notes (optional)"),
      },
      ["id"]
    ),
    parse: (i) => {
      const id = reqStr(i.id, "id");
      const patch = {
        direction: optEnum(i.direction, DIRECTIONS, "direction") as "CREDIT" | "DEBIT" | undefined,
        amount: optNum(i.amount),
        date: optDate(i.date, "date"),
        categoryName: optStr(i.categoryName),
        accountName: optStr(i.accountName),
        clearAccount: i.accountName === "",
        description: optStr(i.description),
        notes: optStr(i.notes),
      };
      if (
        patch.direction === undefined &&
        patch.amount === undefined &&
        patch.date === undefined &&
        patch.categoryName === undefined &&
        patch.accountName === undefined &&
        !patch.clearAccount &&
        patch.description === undefined &&
        patch.notes === undefined
      ) {
        throw new Error("Provide at least one field to update.");
      }
      return { id, patch };
    },
    preview: async ({ id, patch }) => {
      const current = await getEntry(id);
      if (!current) throw new Error(`Entry ${id} not found.`);
      const amt =
        patch.amount !== undefined ? ` → ${taka(patch.amount)}` : ` (${taka(current.amount)})`;
      const cat = patch.categoryName ?? current.categoryName ?? "";
      return `Update entry ${id}: ${cat}${amt} on ${patch.date ?? current.date}.`;
    },
    commit: async ({ id, patch }) => {
      const current = await getEntry(id);
      if (!current) throw new Error(`Entry ${id} not found.`);

      const direction = patch.direction ?? (current.direction as "CREDIT" | "DEBIT");
      let categoryId: string | undefined;
      if (patch.categoryName) {
        const kind = direction === "CREDIT" ? "INCOME" : "EXPENSE";
        categoryId = await ensureCategory(patch.categoryName, kind);
      }

      let accountId: string | null | undefined;
      if (patch.clearAccount) {
        accountId = null;
      } else if (patch.accountName) {
        accountId = (await accountByName(patch.accountName)).id;
      }

      const entry = await updateEntry(id, {
        direction: patch.direction,
        amount: patch.amount,
        date: patch.date,
        categoryId,
        accountId,
        description: patch.description,
        notes: patch.notes,
      });
      return { summary: `Updated entry ${id}.`, data: entry };
    },
  }),

  write({
    name: "delete_money_entry",
    description:
      "Delete a personal ledger entry (income or expense). This is irreversible. " +
      "Retrieve the entry id first via list_money_entries.",
    parameters: schema({ id: Str("Entry id to delete") }, ["id"]),
    parse: (i) => ({ id: reqStr(i.id, "id") }),
    preview: async ({ id }) => {
      const e = await getEntry(id);
      if (!e) throw new Error(`Entry ${id} not found.`);
      const cat = e.categoryName ?? e.direction;
      return `Delete entry: ${taka(e.amount)} ${cat} on ${e.date}. This cannot be undone.`;
    },
    commit: async ({ id }) => {
      const e = await getEntry(id);
      if (!e) throw new Error(`Entry ${id} not found.`);
      await deleteEntry(id);
      return {
        summary: `Deleted entry ${id} (${taka(e.amount)} ${e.categoryName ?? e.direction} on ${e.date}).`,
        data: { deleted: true },
      };
    },
  }),

  // ─── Transfers ───────────────────────────────────────────────────────────────

  write({
    name: "record_money_transfer",
    description:
      "Move money between two accounts (e.g. bank → cash withdrawal, paying a credit-card bill). " +
      "Recorded as a TRANSFER — excluded from income/expense totals and savings. " +
      "Source account balance goes down, destination goes up. " +
      "Account names must match existing accounts (use get_account_balances to list them).",
    parameters: schema(
      {
        fromAccountName: Str("Source account name (e.g. Bank, bKash)"),
        toAccountName: Str("Destination account name (e.g. Cash, Credit Card)"),
        amount: Num("Amount in BDT"),
        date: Str("Date YYYY-MM-DD"),
        description: Str("Description (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["fromAccountName", "toAccountName", "amount", "date"]
    ),
    parse: (i) => ({
      fromAccountName: reqStr(i.fromAccountName, "fromAccountName"),
      toAccountName: reqStr(i.toAccountName, "toAccountName"),
      amount: reqNum(i.amount, "amount"),
      date: reqDate(i.date, "date"),
      description: optStr(i.description) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) =>
      `Transfer ${taka(a.amount)} from ${a.fromAccountName} → ${a.toAccountName} on ${a.date}.`,
    commit: async (a) => {
      const [from, to] = await Promise.all([
        accountByName(a.fromAccountName),
        accountByName(a.toAccountName),
      ]);
      const entry = await recordTransfer({
        fromAccountId: from.id,
        toAccountId: to.id,
        amount: a.amount,
        date: a.date,
        description: a.description,
        notes: a.notes,
      });
      return {
        summary: `Transferred ${taka(a.amount)} from ${from.name} → ${to.name}.`,
        data: entry,
      };
    },
  }),

  // ─── People & Loans ──────────────────────────────────────────────────────────

  write({
    name: "record_person_payment",
    description:
      "Record a payment to or from a person in People & Loans. " +
      "direction=DEBIT (default) = you paid them; direction=CREDIT = they paid you / repaid a loan. " +
      "personName must match an existing beneficiary (use get_people_balances to list them). " +
      "accountName is the source/destination account (optional). " +
      "If the person has exactly one open loan/due in the matching direction, the payment is " +
      "automatically applied to it so its outstanding balance goes down; if they have several open " +
      "loans it is left untagged (apply it to a specific loan in the People & Loans screen).",
    parameters: schema(
      {
        personName: Str("Person name (must exist in People & Loans)"),
        amount: Num("Amount in BDT"),
        date: Str("Date YYYY-MM-DD"),
        direction: Enum(
          PAYMENT_DIRS,
          "DEBIT = you paid them, CREDIT = they paid you (default DEBIT)"
        ),
        accountName: Str("Account name (optional)"),
        description: Str("Description (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["personName", "amount", "date"]
    ),
    parse: (i) => ({
      personName: reqStr(i.personName, "personName"),
      amount: reqNum(i.amount, "amount"),
      date: reqDate(i.date, "date"),
      direction: (optEnum(i.direction, PAYMENT_DIRS, "direction") ?? "DEBIT") as "DEBIT" | "CREDIT",
      accountName: optStr(i.accountName),
      description: optStr(i.description) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const verb = a.direction === "DEBIT" ? "Pay" : "Receive from";
      const acct = a.accountName ? ` via ${a.accountName}` : "";
      return `${verb} ${a.personName}: ${taka(a.amount)} on ${a.date}${acct}.`;
    },
    commit: async (a) => {
      const person = await beneficiaryByName(a.personName);
      const accountId = a.accountName ? (await accountByName(a.accountName)).id : null;

      // Auto-apply to the person's single open loan in the matching direction so
      // its outstanding balance actually goes down (DEBIT settles money I owe;
      // CREDIT settles money owed to me). With several open loans, stay untagged.
      const wantDir = a.direction === "DEBIT" ? "OWED_BY_ME" : "OWED_TO_ME";
      const detail = await getBeneficiaryDetail(person.id);
      const openLoans = (detail?.obligations ?? []).filter(
        (o) =>
          o.type === "LOAN" && o.status === "ACTIVE" && o.direction === wantDir && o.outstanding > 0
      );
      const obligationId = openLoans.length === 1 ? openLoans[0].id : null;

      const entry = await recordPayment({
        beneficiaryId: person.id,
        amount: a.amount,
        date: a.date,
        direction: a.direction,
        obligationId,
        accountId,
        description: a.description,
        notes: a.notes,
      });
      const verb = a.direction === "DEBIT" ? "Paid" : "Received from";
      const applied = obligationId
        ? ` Applied to their open loan — ${taka(Math.max(0, openLoans[0].outstanding - a.amount))} left.`
        : "";
      return {
        summary: `${verb} ${person.name}: ${taka(a.amount)}.${applied}`,
        data: entry,
      };
    },
  }),
];
