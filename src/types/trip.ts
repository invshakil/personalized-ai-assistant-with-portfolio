// Trip Expense Manager — shared DTO types. Re-exported through @/types.
// A trip is a tag over the money ledger; these are the JSON-safe shapes returned
// by src/services/trips/* and consumed by the client API, AI tools, and UI.

// ─── Enums (string-literal unions mirroring the Prisma enums) ────────────────

export type TripStatus = "PLANNING" | "ACTIVE" | "CLOSED";
export type TripCategory =
  | "FLIGHTS"
  | "ACCOMMODATION"
  | "FOOD"
  | "LOCAL_TRANSPORT"
  | "ACTIVITIES"
  | "SHOPPING"
  | "VISA_INSURANCE"
  | "MISC";

export const TRIP_CATEGORIES: TripCategory[] = [
  "FLIGHTS",
  "ACCOMMODATION",
  "FOOD",
  "LOCAL_TRANSPORT",
  "ACTIVITIES",
  "SHOPPING",
  "VISA_INSURANCE",
  "MISC",
];

export const TRIP_CATEGORY_LABEL: Record<TripCategory, string> = {
  FLIGHTS: "Flights",
  ACCOMMODATION: "Accommodation",
  FOOD: "Food",
  LOCAL_TRANSPORT: "Local transport",
  ACTIVITIES: "Activities",
  SHOPPING: "Shopping",
  VISA_INSURANCE: "Visa & insurance",
  MISC: "Miscellaneous",
};

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  PLANNING: "Planning",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

export type TripSplitMode = "EQUAL" | "EXACT";

// ─── Rows ─────────────────────────────────────────────────────────────────────

export interface TripBudgetRow {
  id: string;
  tripId: string;
  category: TripCategory;
  plannedAmount: number; // BDT-canonical
}

export interface TripRow {
  id: string;
  name: string;
  destination: string;
  homeCurrency: string;
  localCurrency: string;
  startDate: string; // ISO
  endDate: string | null; // ISO
  status: TripStatus;
  localWalletAccountId: string | null;
  localWalletAccountName: string | null;
  notes: string | null;
  publicSlug: string | null;
  isPublic: boolean;
  publicIntro: string | null;
  budgets: TripBudgetRow[];
  // Computed (service layer):
  totalPlannedBdt: number;
  totalActualBdt: number;
  expenseCount: number;
}

// ─── Group split rows (participants, expenses, settlements) ───────────────────

export interface TripParticipantRow {
  id: string;
  tripId: string;
  name: string;
  isSelf: boolean;
  beneficiaryId: string | null;
  beneficiaryName: string | null;
  isActive: boolean;
  note: string | null;
}

export interface TripExpenseShareRow {
  participantId: string;
  participantName: string;
  amount: number; // in the expense currency
  amountBdt: number;
}

export interface TripExpenseRow {
  id: string;
  tripId: string;
  description: string | null;
  category: TripCategory;
  date: string; // ISO
  currency: string;
  amount: number; // total group cost in `currency`
  fxRate: number | null; // BDT per 1 unit of currency
  amountBdt: number;
  payerId: string;
  payerName: string;
  payerIsSelf: boolean;
  splitMode: TripSplitMode;
  accountId: string | null;
  accountName: string | null;
  accountType: string | null; // MoneyAccountType of the funding account (for bucketing)
  /** True when this expense posted a MoneyEntry to the personal money ledger. */
  posted: boolean;
  shares: TripExpenseShareRow[];
}

export interface TripSettlementRow {
  id: string;
  tripId: string;
  date: string; // ISO
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amount: number;
  currency: string;
  fxRate: number | null;
  amountBdt: number;
  note: string | null;
}

// ─── Report ─────────────────────────────────────────────────────────────────--

export interface TripCategoryReport {
  category: TripCategory;
  plannedBdt: number;
  actualBdt: number;
}

/** Immediate leisure-balance impact (cash/bank) vs deferred (credit card). */
export interface TripSettlementSplit {
  outOfPocketBdt: number; // CASH / BANK / MOBILE_WALLET / OTHER debits
  creditCardBdt: number; // CREDIT_CARD debits (settled later)
}

export interface TripCurrencyBreakdown {
  currency: string;
  originalAmount: number; // summed in that currency
  bdt: number; // valued in BDT via each row's stored rate
}

/** The foreign "trip wallet": funded by conversion, spent from, leftover at end. */
export interface TripWalletSummary {
  accountId: string;
  accountName: string;
  currency: string;
  fundedLocal: number; // total local received via BDT→local conversions
  fundedBdt: number; // BDT that left home accounts to fund it
  spentLocal: number; // local spent from the wallet on the trip
  balanceLocal: number; // current wallet balance (leftover)
  balanceBdt: number | null; // leftover valued in BDT (live rate; null if unavailable)
}

export interface TripDaySpend {
  date: string; // yyyy-mm-dd
  bdt: number;
}

/** Per-participant tally for the who-owes-whom view (all BDT). `net > 0` ⇒ the
 *  group owes this person; `net < 0` ⇒ this person owes the group. */
export interface TripPersonBalance {
  participantId: string;
  name: string;
  isSelf: boolean;
  paidBdt: number; // expenses this person fronted
  spentBdt: number; // this person's share of expenses (their consumption)
  settlementsPaidBdt: number; // money they handed to others (contributions / settle-ups out)
  settlementsReceivedBdt: number; // money others handed to them
  netBdt: number; // paid + settlementsPaid − spent − settlementsReceived
}

/** One suggested settle-up transfer from the greedy minimal-transfer pass. */
export interface TripOwesTransfer {
  fromParticipantId: string;
  fromName: string;
  toParticipantId: string;
  toName: string;
  amountBdt: number;
}

export interface TripReport {
  trip: TripRow;
  byCategory: TripCategoryReport[];
  /** Syful's own cash flow: immediate (cash/bank/wallet) vs deferred (credit card). */
  personalCashFlow: TripSettlementSplit;
  byCurrency: TripCurrencyBreakdown[];
  byDay: TripDaySpend[];
  wallet: TripWalletSummary | null;
  /** Per-person paid/spent/net and the minimal settle-up transfers. */
  participants: TripPersonBalance[];
  owes: TripOwesTransfer[];
  totalPlannedBdt: number;
  totalActualBdt: number; // total group cost across all payers
  paidByMeBdt: number; // subset self (Syful) fronted
}

// ─── Public (aggregate-safe) summary for /trips/[slug] ─────────────────────────

export interface PublicTripCategory {
  category: TripCategory;
  label: string;
  bdt: number;
  local: number; // valued in localCurrency at the live rate
}

export interface PublicTripSummary {
  name: string;
  destination: string;
  localCurrency: string;
  homeCurrency: string;
  startDate: string;
  endDate: string | null;
  durationDays: number | null;
  publicIntro: string | null;
  totalBdt: number;
  totalLocal: number;
  byCategory: PublicTripCategory[];
  byDay: TripDaySpend[];
}
