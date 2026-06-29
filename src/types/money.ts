// Money Manager (personal finance) — shared types. Re-exported through @/types.
// These are the JSON-safe DTO shapes returned by src/services/money/* and
// consumed by the client API, AI tools, and admin UI. Mirrors src/types/property.ts.

// ─── Enums (string-literal unions mirroring the Prisma enums) ────────────────

export type MoneyEntryDirection = "CREDIT" | "DEBIT" | "TRANSFER";
export type MoneyAccountType = "CASH" | "BANK" | "MOBILE_WALLET" | "CREDIT_CARD" | "OTHER";
export type MoneyCategoryKind = "INCOME" | "EXPENSE";
export type ObligationType = "RECURRING" | "LOAN";
export type ObligationDirection = "OWED_TO_ME" | "OWED_BY_ME";
export type ObligationStatus = "ACTIVE" | "CLOSED" | "CANCELLED";
export type MoneyEntrySource = "MANUAL" | "IMPORTED";

// ─── Accounts ────────────────────────────────────────────────────────────────

export interface MoneyAccountRow {
  id: string;
  name: string;
  type: MoneyAccountType;
  currency: string; // BDT | USD | EUR — balance is in this currency
  openingBalance: number;
  creditLimit: number | null;
  isActive: boolean;
  notes: string | null;
  // Computed (service layer):
  balance: number; // openingBalance + Σ credits − Σ debits ± transfers (in `currency`)
  availableCredit: number | null; // CREDIT_CARD only = creditLimit + balance
  entryCount: number;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface MoneyCategoryRow {
  id: string;
  name: string;
  kind: MoneyCategoryKind;
  isActive: boolean;
  entryCount: number;
}

// ─── Ledger entries ────────────────────────────────────────────────────────--

export interface MoneyEntryRow {
  id: string;
  date: string; // ISO
  direction: MoneyEntryDirection;
  amount: number; // in `currency` (source account currency for TRANSFER)
  currency: string;
  toAmount: number | null; // TRANSFER: amount arriving at destination, in dest currency
  fxRate: number | null; // BDT per 1 unit of `currency` (null treated as 1)
  categoryId: string | null; // null for TRANSFER
  categoryName: string | null;
  categoryKind: MoneyCategoryKind | null;
  accountId: string | null;
  accountName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  beneficiaryId: string | null;
  beneficiaryName: string | null;
  obligationId: string | null;
  description: string | null;
  notes: string | null;
  source: MoneyEntrySource;
}

// ─── People you pay (beneficiaries + obligations) ──────────────────────────────

export interface ObligationRow {
  id: string;
  beneficiaryId: string;
  type: ObligationType;
  direction: ObligationDirection;
  amount: number; // recurring: per-period; loan: principal
  frequency: string | null;
  startDate: string; // ISO
  endDate: string | null; // ISO; null = ongoing
  status: ObligationStatus;
  notes: string | null;
  // Computed:
  totalPaid: number; // Σ of tagged repayment entries
  outstanding: number; // LOAN: amount − totalPaid (may be negative = overpaid); RECURRING: 0
}

export interface BeneficiaryRow {
  id: string;
  name: string;
  relationship: string | null;
  phone: string | null;
  isActive: boolean;
  notes: string | null;
  // Computed:
  obligationCount: number;
  totalPaid: number; // lifetime paid to this person
  outstandingByMe: number; // Σ open OWED_BY_ME loan balances
  outstandingToMe: number; // Σ open OWED_TO_ME loan balances
}

export interface BeneficiaryDetail extends BeneficiaryRow {
  obligations: ObligationRow[];
  payments: MoneyEntryRow[]; // entries tagged with this beneficiary, newest first
}

// ─── Dashboard ─────────────────────────────────────────────────────────────--

export interface SavingsPoint {
  period: string; // "YYYY-MM"
  income: number;
  expense: number;
  savings: number;
}

export interface ExpenseCategorySlice {
  categoryId: string;
  name: string;
  total: number;
}

export interface VenturePoint {
  period: string; // "YYYY-MM"
  propertyNet: number; // read-only context (not summed into savings)
  businessNet: number;
  recordedIncome: number; // ledger income credits recorded that month, for comparison
}

export interface AccountBalanceSummary {
  id: string;
  name: string;
  type: MoneyAccountType;
  currency: string;
  balance: number; // in `currency`
  creditLimit: number | null;
  availableCredit: number | null;
}

/** Per-currency asset-balance breakdown (for the combined-total panel). */
export interface CurrencyBalance {
  currency: string;
  native: number; // sum of asset-account balances in this currency
  rate: number | null; // BDT per 1 unit (null = no rate available)
  bdt: number; // native × rate (0 when rate unavailable)
}

export interface MoneyDashboardData {
  range: string; // human label
  totals: {
    income: number;
    expense: number;
    savings: number;
    savingsRate: number; // 0–1 (savings / income); 0 when income is 0
  };
  savings: SavingsPoint[]; // calendar-month series, oldest first
  expenseByCategory: ExpenseCategorySlice[]; // largest first
  accounts: AccountBalanceSummary[];
  cashPosition: number; // Σ asset-account balances in BDT (foreign converted at latest rate)
  cardDebt: number; // Σ owed across credit cards, in BDT (positive number)
  balancesByCurrency: CurrencyBalance[]; // per-currency asset breakdown (native + BDT)
  fxAsOf: string | null; // ISO timestamp of the latest FX rate used (null = all BDT)
  peopleOwed: {
    owedByMe: number; // total I still owe
    owedToMe: number; // total still owed to me
  };
  venture: VenturePoint[]; // read-only context panel
}
