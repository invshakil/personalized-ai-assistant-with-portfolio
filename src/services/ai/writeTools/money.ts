// Money Manager write tools — personal ledger mutations (income, expense,
// transfer, person payment). Each delegates to src/services/money/ with no
// business logic here. Accounts and beneficiaries are resolved by name so the
// model can use natural-language references ("Cash", "bKash", "Mum").
import {
  listAccountsWithBalances,
  createAccount,
  createEntry,
  updateEntry,
  deleteEntry,
  recordTransfer,
  getBeneficiaries,
  getBeneficiaryDetail,
  createBeneficiary,
  createObligation,
  updateObligation,
  recordPayment,
  ensureCategory,
  getEntry,
} from "@/services/money";
import type { MoneyAccountType, ObligationDirection, ObligationType } from "@/types";
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
  cur,
  CURRENCIES,
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
const METHODS = ["CASH", "BANK_TRANSFER", "MOBILE_BANKING", "CHEQUE", "OTHER"] as const;
const PAYMENT_DIRS = ["DEBIT", "CREDIT"] as const;
const ACCOUNT_TYPES = ["CASH", "BANK", "MOBILE_WALLET", "CREDIT_CARD", "OTHER"] as const;
const OBLIGATION_DIRS = ["OWED_BY_ME", "OWED_TO_ME"] as const;
const OBLIGATION_TYPES = ["LOAN", "RECURRING"] as const;

const todayIso = () => new Date().toISOString().slice(0, 10);

export const moneyTools: WriteToolDef[] = [
  // ─── Ledger entries ──────────────────────────────────────────────────────────

  write({
    name: "create_money_entry",
    description:
      "Add a personal income (CREDIT) or expense (DEBIT) ledger entry. " +
      "direction=CREDIT for money coming in, DEBIT for money going out — this is also how you record a " +
      "deposit/top-up into an account (e.g. cash you received, a bank deposit, money someone sent you). " +
      "categoryName is free-text — it will be created if it doesn't exist (INCOME for CREDIT, EXPENSE for DEBIT). " +
      "accountName must match an existing account (use get_account_balances to list them); the amount is " +
      "in that account's currency (e.g. a USD account → amount is USD; BDT/no account → BDT). " +
      "method (CREDIT only) records how the money arrived: CASH, BANK_TRANSFER, MOBILE_BANKING, CHEQUE, OTHER. " +
      "To move money between two of your own accounts (e.g. cash withdrawal) use record_money_transfer instead.",
    parameters: schema(
      {
        direction: Enum(DIRECTIONS, "CREDIT (income) or DEBIT (expense)"),
        amount: Num("Amount, in the account's currency (BDT if no account)"),
        date: Str("Date YYYY-MM-DD"),
        categoryName: Str("Category name (created if needed, e.g. Groceries, Salary)"),
        accountName: Str("Account name, e.g. Cash, bKash (optional)"),
        method: Enum(METHODS, "How a CREDIT arrived (optional; CREDIT only)"),
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
      method: optEnum(i.method, METHODS, "method"),
      description: optStr(i.description) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const account = a.accountName ? await accountByName(a.accountName) : null;
      const ccy = account?.currency ?? "BDT";
      const acct = a.accountName ? ` from ${a.accountName}` : "";
      const verb = a.direction === "CREDIT" ? "Record income" : "Record expense";
      return `${verb}: ${cur(a.amount, ccy)} — ${a.categoryName}${acct} on ${a.date}.`;
    },
    commit: async (a) => {
      const kind = a.direction === "CREDIT" ? "INCOME" : "EXPENSE";
      const categoryId = await ensureCategory(a.categoryName, kind);
      const account = a.accountName ? await accountByName(a.accountName) : null;
      const entry = await createEntry({
        date: a.date,
        direction: a.direction,
        amount: a.amount,
        categoryId,
        accountId: account?.id ?? null,
        method: a.direction === "CREDIT" ? a.method : null,
        description: a.description,
        notes: a.notes,
      });
      const acct = a.accountName ? ` → ${a.accountName}` : "";
      return {
        summary: `Recorded ${cur(a.amount, account?.currency ?? "BDT")} ${a.direction === "CREDIT" ? "income" : "expense"} (${a.categoryName}${acct}).`,
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
        method: Enum(METHODS, "New source — how a CREDIT arrived (optional; CREDIT only)"),
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
        method: optEnum(i.method, METHODS, "method"),
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
        patch.method === undefined &&
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
        method: patch.method,
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
      "Source account balance goes down by amount (source currency), destination goes up by toAmount (destination currency). " +
      "For a CROSS-CURRENCY transfer (the two accounts hold different currencies, e.g. a USD→BDT exchange) you MUST pass toAmount = the amount that arrives in the destination currency. " +
      "If the source charges a fee (e.g. a mobile-wallet cash-out fee), pass fee = the fee amount in the source currency: it is booked as a separate EXPENSE on the source, so the source loses amount + fee while the destination still receives the full amount. " +
      "Account names must match existing accounts (use get_account_balances to list them).",
    parameters: schema(
      {
        fromAccountName: Str("Source account name (e.g. Bank, bKash)"),
        toAccountName: Str("Destination account name (e.g. Cash, Credit Card)"),
        amount: Num("Amount leaving the source, in the source account's currency"),
        toAmount: Num(
          "Amount arriving at the destination, in the destination currency — required only for cross-currency transfers"
        ),
        fee: Num(
          "Fee the source charges for the transfer, in the source currency (optional) — booked as a separate expense on the source account"
        ),
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
      toAmount: optNum(i.toAmount),
      fee: optNum(i.fee),
      date: reqDate(i.date, "date"),
      description: optStr(i.description) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const [from, to] = await Promise.all([
        accountByName(a.fromAccountName),
        accountByName(a.toAccountName),
      ]);
      const dest =
        from.currency !== to.currency && a.toAmount != null
          ? ` → ${cur(a.toAmount, to.currency)}`
          : "";
      const feeNote =
        a.fee != null && a.fee > 0
          ? ` (+ ${cur(a.fee, from.currency)} fee as expense; source debited ${cur(a.amount + a.fee, from.currency)})`
          : "";
      return `Transfer ${cur(a.amount, from.currency)} from ${from.name} → ${to.name}${dest} on ${a.date}${feeNote}.`;
    },
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
        ...(a.toAmount != null && { toAmount: a.toAmount }),
        ...(a.fee != null && { fee: a.fee }),
      });
      const dest =
        from.currency !== to.currency && entry.toAmount != null
          ? ` → ${cur(entry.toAmount, to.currency)} (@ ${entry.fxRate})`
          : "";
      const feeNote =
        a.fee != null && a.fee > 0 ? ` (+ ${cur(a.fee, from.currency)} fee booked as expense)` : "";
      return {
        summary: `Transferred ${cur(a.amount, from.currency)} from ${from.name} → ${to.name}${dest}${feeNote}.`,
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

  // ─── Setup: accounts, people, loans ────────────────────────────────────────--

  write({
    name: "create_money_account",
    description:
      "Add a personal money account (where funds live). type: CASH, BANK, MOBILE_WALLET (e.g. bKash/Nagad), CREDIT_CARD, or OTHER. " +
      "openingBalance is the current balance to start the account at (default 0). creditLimit applies only to CREDIT_CARD. " +
      "Use this before assigning entries to a new account.",
    parameters: schema(
      {
        name: Str("Account name, e.g. Cash, City Bank, bKash"),
        type: Enum(ACCOUNT_TYPES, "CASH, BANK, MOBILE_WALLET, CREDIT_CARD or OTHER"),
        currency: Enum(CURRENCIES, "Account currency: BDT (default), USD or EUR"),
        openingBalance: Num("Starting balance in the account's currency (default 0)"),
        creditLimit: Num("Credit limit (CREDIT_CARD only, optional)"),
        notes: Str("Notes (optional)"),
      },
      ["name", "type"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      type: reqEnum(i.type, ACCOUNT_TYPES, "type") as MoneyAccountType,
      currency: (optEnum(i.currency, CURRENCIES, "currency") ?? "BDT") as string,
      openingBalance: optNum(i.openingBalance),
      creditLimit: optNum(i.creditLimit),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const bal =
        a.openingBalance != null
          ? ` with opening balance ${cur(a.openingBalance, a.currency)}`
          : "";
      const ccy = a.currency !== "BDT" ? ` (${a.currency})` : "";
      return `Create ${a.type.toLowerCase().replace("_", " ")} account "${a.name}"${ccy}${bal}.`;
    },
    commit: async (a) => {
      const existing = await listAccountsWithBalances();
      if (existing.some((x) => x.name.toLowerCase() === a.name.toLowerCase())) {
        throw new Error(`An account named "${a.name}" already exists.`);
      }
      const account = await createAccount({
        name: a.name,
        type: a.type,
        currency: a.currency,
        openingBalance: a.openingBalance ?? 0,
        creditLimit: a.creditLimit ?? null,
        notes: a.notes,
      });
      return {
        summary: `Created ${a.type} account "${account.name}" (${account.currency}).`,
        data: account,
      };
    },
  }),

  write({
    name: "create_person",
    description:
      "Add a person or shop to People & Loans so money owed to/from them can be tracked " +
      "(e.g. a supplier you buy from on credit). This only creates the contact — use " +
      "create_person_loan to record what is owed, and record_person_payment when money changes hands.",
    parameters: schema(
      {
        name: Str("Person or shop name"),
        relationship: Str("Relationship, e.g. brother, shop, lender (optional)"),
        phone: Str("Phone number (optional)"),
        notes: Str("Notes (optional)"),
      },
      ["name"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      relationship: optStr(i.relationship) ?? null,
      phone: optStr(i.phone) ?? null,
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) =>
      `Add ${a.relationship ? `${a.relationship} ` : ""}"${a.name}" to People & Loans.`,
    commit: async (a) => {
      const people = await getBeneficiaries();
      if (people.some((p) => p.name.toLowerCase() === a.name.toLowerCase())) {
        throw new Error(`A person named "${a.name}" already exists in People & Loans.`);
      }
      const person = await createBeneficiary({
        name: a.name,
        relationship: a.relationship,
        phone: a.phone,
        notes: a.notes,
      });
      return { summary: `Added "${person.name}" to People & Loans.`, data: person };
    },
  }),

  write({
    name: "create_person_loan",
    description:
      "Record money owed between you and a person/shop in People & Loans. " +
      "direction=OWED_BY_ME (default) = you owe them (e.g. a shop credit tab, or a loan you took); " +
      "OWED_TO_ME = they owe you (you lent). " +
      "type=LOAN (default) is a running balance reduced by payments; type=RECURRING repeats (e.g. monthly allowance) and takes a frequency. " +
      "personName must already exist (use create_person first). amount is the starting principal (or per-period amount) in BDT.",
    parameters: schema(
      {
        personName: Str("Person/shop name (must exist in People & Loans)"),
        amount: Num("Amount owed in BDT (loan principal, or per-period for recurring)"),
        direction: Enum(
          OBLIGATION_DIRS,
          "OWED_BY_ME = you owe them (default), OWED_TO_ME = they owe you"
        ),
        type: Enum(OBLIGATION_TYPES, "LOAN (running balance, default) or RECURRING"),
        frequency: Str("Frequency for RECURRING, e.g. monthly (optional)"),
        startDate: Str("Start date YYYY-MM-DD (default today)"),
        notes: Str("Notes (optional)"),
      },
      ["personName", "amount"]
    ),
    parse: (i) => ({
      personName: reqStr(i.personName, "personName"),
      amount: reqNum(i.amount, "amount"),
      direction: (optEnum(i.direction, OBLIGATION_DIRS, "direction") ??
        "OWED_BY_ME") as ObligationDirection,
      type: (optEnum(i.type, OBLIGATION_TYPES, "type") ?? "LOAN") as ObligationType,
      frequency: optStr(i.frequency) ?? null,
      startDate: optDate(i.startDate, "startDate"),
      notes: optStr(i.notes) ?? null,
    }),
    preview: async (a) => {
      const who =
        a.direction === "OWED_BY_ME" ? `you owe ${a.personName}` : `${a.personName} owes you`;
      const per = a.type === "RECURRING" && a.frequency ? ` / ${a.frequency}` : "";
      return `Record ${a.type === "LOAN" ? "loan/due" : "recurring"}: ${who} ${taka(a.amount)}${per}.`;
    },
    commit: async (a) => {
      const person = await beneficiaryByName(a.personName);
      const obligation = await createObligation({
        beneficiaryId: person.id,
        type: a.type,
        direction: a.direction,
        amount: a.amount,
        frequency: a.type === "RECURRING" ? a.frequency : null,
        startDate: a.startDate ?? todayIso(),
        notes: a.notes,
      });
      const who =
        a.direction === "OWED_BY_ME" ? `You owe ${person.name}` : `${person.name} owes you`;
      return {
        summary: `${who} ${taka(a.amount)} (${a.type === "LOAN" ? "loan/due" : "recurring"}).`,
        data: obligation,
      };
    },
  }),

  write({
    name: "increase_person_loan",
    description:
      "Grow an existing running balance in People & Loans — e.g. you bought more on a shop's credit tab " +
      "(you owe more), or you lent someone more. amount is the value to ADD to what is already owed. " +
      "direction picks the side to grow: OWED_BY_ME (default) = you owe them, OWED_TO_ME = they owe you. " +
      "The person must have exactly one open loan/due in that direction. No cash moves — only the owed " +
      "balance changes; use record_money_transfer or record_person_payment when money actually changes hands.",
    parameters: schema(
      {
        personName: Str("Person/shop name"),
        amount: Num("Amount to add to what is owed, in BDT"),
        direction: Enum(
          OBLIGATION_DIRS,
          "OWED_BY_ME = you owe them (default), OWED_TO_ME = they owe you"
        ),
      },
      ["personName", "amount"]
    ),
    parse: (i) => ({
      personName: reqStr(i.personName, "personName"),
      amount: reqNum(i.amount, "amount"),
      direction: (optEnum(i.direction, OBLIGATION_DIRS, "direction") ??
        "OWED_BY_ME") as ObligationDirection,
    }),
    preview: async (a) => {
      const who =
        a.direction === "OWED_BY_ME"
          ? `what you owe ${a.personName}`
          : `what ${a.personName} owes you`;
      return `Increase ${who} by ${taka(a.amount)}.`;
    },
    commit: async (a) => {
      if (a.amount <= 0) throw new Error("amount must be greater than 0");
      const person = await beneficiaryByName(a.personName);
      const detail = await getBeneficiaryDetail(person.id);
      const open = (detail?.obligations ?? []).filter(
        (o) => o.type === "LOAN" && o.status === "ACTIVE" && o.direction === a.direction
      );
      if (open.length === 0) {
        const what = a.direction === "OWED_BY_ME" ? "due you owe" : "loan owed to you";
        throw new Error(
          `${person.name} has no open ${what}. Create one first with create_person_loan.`
        );
      }
      if (open.length > 1) {
        throw new Error(
          `${person.name} has ${open.length} open loans in that direction — apply it to a specific one in the People & Loans screen.`
        );
      }
      const loan = open[0];
      const obligation = await updateObligation(loan.id, { amount: loan.amount + a.amount });
      const who =
        a.direction === "OWED_BY_ME" ? `You now owe ${person.name}` : `${person.name} now owes you`;
      return {
        summary: `${who} ${taka(loan.outstanding + a.amount)} (added ${taka(a.amount)}).`,
        data: obligation,
      };
    },
  }),
];
