// Money Manager CLI — operate the personal-finance module from a terminal /
// Claude Code session. ALL logic lives in src/services/money; this only parses
// args and prints. Drives the `/money` slash command.
//
//   npx tsx scripts/money.ts balances
//   npx tsx scripts/money.ts savings --period last_3_months
//   npx tsx scripts/money.ts owed
//   npx tsx scripts/money.ts add-expense --amount 1200 --category Groceries --account Cash [--date 2026-06-18] [--desc "weekly shop"]
//   npx tsx scripts/money.ts add-income  --amount 50000 --category Salary --account "City Bank"
//   npx tsx scripts/money.ts transfer --from "City Bank" --to Cash --amount 5000
//   npx tsx scripts/money.ts pay-person --person "Rahim" --amount 10000 --account Cash [--direction out|in]
//
// Add --json to any command for machine-readable output.
import { existsSync, readFileSync } from "node:fs";

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

type Args = { flags: Record<string, string | true>; positionals: string[] };

function parseArgs(argv: string[]): Args {
  const flags: Record<string, string | true> = {};
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(a);
    }
  }
  return { flags, positionals };
}

const bdt = (n: number) => `৳${Math.round(n).toLocaleString("en-IN")}`;
const CUR_SYMBOL: Record<string, string> = { BDT: "৳", USD: "$", EUR: "€" };
/** Amount in its own currency (integer BDT, 2dp foreign). */
const cur = (n: number, code: string) => {
  const sym = CUR_SYMBOL[code] ?? `${code} `;
  if (code === "BDT") return `${sym}${Math.round(n).toLocaleString("en-IN")}`;
  return `${sym}${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
const todayIso = () => new Date().toISOString().slice(0, 10);

function reqStr(flags: Record<string, string | true>, key: string): string {
  const v = flags[key];
  if (typeof v !== "string" || v === "") throw new Error(`--${key} is required`);
  return v;
}
function reqNum(flags: Record<string, string | true>, key: string): number {
  const n = Number(reqStr(flags, key));
  if (!Number.isFinite(n)) throw new Error(`--${key} must be a number`);
  return n;
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const { flags } = parseArgs(rest);
  const json = flags.json === true;
  const money = await import("@/services/money");
  const out = (label: string, data: unknown) => {
    if (json) console.log(JSON.stringify(data, null, 2));
    else console.log(label);
  };

  const resolveAccountId = async (name: string): Promise<string> => {
    const accounts = await money.listAccountsWithBalances();
    const a = accounts.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!a)
      throw new Error(
        `Account "${name}" not found. Have: ${accounts.map((x) => x.name).join(", ") || "(none)"}`
      );
    return a.id;
  };

  switch (cmd) {
    case "balances": {
      const data = await money.getAccountBalances();
      out(
        [
          ...data.accounts.map(
            (a) =>
              `  ${a.name.padEnd(20)} ${cur(a.balance, a.currency)}` +
              (a.currency !== "BDT" ? ` (≈ ${bdt(a.balanceBdt)})` : "")
          ),
          `  ${"—".repeat(28)}`,
          `  Cash position: ${bdt(data.cashPositionBdt)} (BDT-converted)`,
          `  Credit-card debt: ${bdt(data.cardDebtBdt)}`,
        ].join("\n"),
        data
      );
      break;
    }
    case "savings": {
      const period = typeof flags.period === "string" ? flags.period : undefined;
      const data = await money.getMonthlySavings({ period });
      out(
        [
          `Savings (${data.range}):`,
          ...data.months.map(
            (m) =>
              `  ${m.period}  in ${bdt(m.income)}  out ${bdt(m.expense)}  saved ${bdt(m.savings)}`
          ),
          `  ${"—".repeat(28)}`,
          `  Total income:  ${bdt(data.totals.income)}`,
          `  Total expense: ${bdt(data.totals.expense)}`,
          `  Net savings:   ${bdt(data.totals.savings)} (${(data.totals.savingsRate * 100).toFixed(1)}%)`,
        ].join("\n"),
        data
      );
      break;
    }
    case "owed":
    case "people": {
      const data = await money.getBeneficiaryBalances();
      out(
        [
          `I still owe:  ${bdt(data.totalOwedByMe)}`,
          `Owed to me:   ${bdt(data.totalOwedToMe)}`,
          ...data.people.map(
            (p) =>
              `  ${p.name.padEnd(18)} owe ${bdt(p.outstandingByMe)} · owed ${bdt(p.outstandingToMe)} · paid ${bdt(p.totalPaid)}`
          ),
        ].join("\n"),
        data
      );
      break;
    }
    case "add-expense": {
      const categoryId = await money.ensureCategory(reqStr(flags, "category"), "EXPENSE");
      const entry = await money.createEntry({
        date: typeof flags.date === "string" ? flags.date : todayIso(),
        direction: "DEBIT",
        amount: reqNum(flags, "amount"),
        categoryId,
        accountId: typeof flags.account === "string" ? await resolveAccountId(flags.account) : null,
        description: typeof flags.desc === "string" ? flags.desc : null,
      });
      out(`Recorded expense ${cur(entry.amount, entry.currency)} (${entry.categoryName}).`, entry);
      break;
    }
    case "add-income": {
      const categoryId = await money.ensureCategory(reqStr(flags, "category"), "INCOME");
      const entry = await money.createEntry({
        date: typeof flags.date === "string" ? flags.date : todayIso(),
        direction: "CREDIT",
        amount: reqNum(flags, "amount"),
        categoryId,
        accountId: typeof flags.account === "string" ? await resolveAccountId(flags.account) : null,
        description: typeof flags.desc === "string" ? flags.desc : null,
      });
      out(`Recorded income ${cur(entry.amount, entry.currency)} (${entry.categoryName}).`, entry);
      break;
    }
    case "transfer": {
      const toAmount =
        typeof flags["to-amount"] === "string" ? Number(flags["to-amount"]) : undefined;
      const entry = await money.recordTransfer({
        fromAccountId: await resolveAccountId(reqStr(flags, "from")),
        toAccountId: await resolveAccountId(reqStr(flags, "to")),
        amount: reqNum(flags, "amount"),
        date: typeof flags.date === "string" ? flags.date : todayIso(),
        description: typeof flags.desc === "string" ? flags.desc : null,
        ...(toAmount != null && { toAmount }),
      });
      const crossCurrency = entry.toAmount != null && entry.toAmount !== entry.amount;
      out(
        `Transferred ${cur(entry.amount, entry.currency)}` +
          (crossCurrency ? ` (arrived ${entry.toAmount} @ rate ${entry.fxRate})` : "") +
          ".",
        entry
      );
      break;
    }
    case "pay-person": {
      const name = reqStr(flags, "person");
      const people = await money.getBeneficiaries();
      const person = people.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (!person) throw new Error(`Person "${name}" not found.`);
      const direction = flags.direction === "in" ? "CREDIT" : "DEBIT";
      const entry = await money.recordPayment({
        beneficiaryId: person.id,
        amount: reqNum(flags, "amount"),
        date: typeof flags.date === "string" ? flags.date : todayIso(),
        direction,
        accountId: typeof flags.account === "string" ? await resolveAccountId(flags.account) : null,
      });
      out(
        `Recorded ${direction === "DEBIT" ? "payment to" : "receipt from"} ${person.name}: ${bdt(entry.amount)}.`,
        entry
      );
      break;
    }
    default:
      console.log(
        [
          "Money Manager CLI. Commands:",
          "  balances",
          "  savings [--period last_3_months|this_month|last_12_months|all]",
          "  owed",
          "  add-expense --amount N --category NAME [--account NAME] [--date YYYY-MM-DD] [--desc TEXT]",
          "  add-income  --amount N --category NAME [--account NAME] [--date] [--desc]",
          "  transfer --from NAME --to NAME --amount N [--to-amount N] [--date] [--desc]",
          "  pay-person --person NAME --amount N [--account NAME] [--direction out|in] [--date]",
          "Add --json for machine-readable output.",
        ].join("\n")
      );
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
