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

export interface TripReport {
  trip: TripRow;
  byCategory: TripCategoryReport[];
  settlement: TripSettlementSplit;
  byCurrency: TripCurrencyBreakdown[];
  byDay: TripDaySpend[];
  wallet: TripWalletSummary | null;
  totalPlannedBdt: number;
  totalActualBdt: number;
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
