// Client API for the Trip Expense Manager. Components/hooks call these instead of
// inlining fetch + URLs. URLs are relative to the client baseURL (/api/admin).
import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  MoneyEntryRow,
  TripBudgetRow,
  TripCategory,
  TripExpenseRow,
  TripParticipantRow,
  TripReport,
  TripRow,
  TripSettlementRow,
  TripSplitMode,
  TripStatus,
} from "@/types";

export interface TripPayload {
  name: string;
  destination: string;
  localCurrency: string;
  homeCurrency?: string;
  startDate: string;
  endDate?: string | null;
  status?: TripStatus;
  localWalletAccountId?: string | null;
  notes?: string | null;
  publicIntro?: string | null;
}

export interface TripShareInputPayload {
  participantId: string;
  amount?: number; // required only for EXACT split
}

export interface TripExpensePayload {
  category: TripCategory;
  date: string;
  description?: string | null;
  payerId: string;
  splitMode?: TripSplitMode;
  shares: TripShareInputPayload[];
  accountId?: string | null;
  amount: number;
  currency?: string;
  fxRate?: number;
}

export interface TripParticipantPayload {
  name: string;
  isSelf?: boolean;
  beneficiaryId?: string | null;
  note?: string | null;
}

export interface TripSettlementPayload {
  date: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: number;
  currency?: string;
  fxRate?: number;
  note?: string | null;
}

export interface FundWalletPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  toAmount?: number;
  date: string;
  notes?: string | null;
}

export const tripsApi = {
  listTrips: () => apiGet<TripRow[]>("/trips"),
  getTrip: (id: string) => apiGet<TripRow>(`/trips/${id}`),
  createTrip: (body: TripPayload) => apiPost<TripRow>("/trips", body),
  updateTrip: (id: string, body: Partial<TripPayload>) => apiPut<TripRow>(`/trips/${id}`, body),
  deleteTrip: (id: string) => apiDelete(`/trips/${id}`),

  listBudgets: (id: string) => apiGet<TripBudgetRow[]>(`/trips/${id}/budgets`),
  setBudget: (id: string, body: { category: TripCategory; plannedAmount: number }) =>
    apiPut<TripBudgetRow>(`/trips/${id}/budgets`, body),

  listParticipants: (id: string) => apiGet<TripParticipantRow[]>(`/trips/${id}/participants`),
  createParticipant: (id: string, body: TripParticipantPayload) =>
    apiPost<TripParticipantRow>(`/trips/${id}/participants`, body),
  updateParticipant: (id: string, pid: string, body: Partial<TripParticipantPayload>) =>
    apiPut<TripParticipantRow>(`/trips/${id}/participants/${pid}`, body),
  deleteParticipant: (id: string, pid: string) => apiDelete(`/trips/${id}/participants/${pid}`),

  listExpenses: (id: string) => apiGet<TripExpenseRow[]>(`/trips/${id}/expenses`),
  createExpense: (id: string, body: TripExpensePayload) =>
    apiPost<TripExpenseRow>(`/trips/${id}/expenses`, body),
  updateExpense: (id: string, expenseId: string, body: TripExpensePayload) =>
    apiPut<TripExpenseRow>(`/trips/${id}/expenses/${expenseId}`, body),
  deleteExpense: (id: string, expenseId: string) => apiDelete(`/trips/${id}/expenses/${expenseId}`),

  listSettlements: (id: string) => apiGet<TripSettlementRow[]>(`/trips/${id}/settlements`),
  createSettlement: (id: string, body: TripSettlementPayload) =>
    apiPost<TripSettlementRow>(`/trips/${id}/settlements`, body),
  deleteSettlement: (id: string, sid: string) => apiDelete(`/trips/${id}/settlements/${sid}`),

  fundWallet: (id: string, body: FundWalletPayload) =>
    apiPost<MoneyEntryRow>(`/trips/${id}/fund`, body),

  getReport: (id: string) => apiGet<TripReport>(`/trips/${id}/report`),

  publish: (id: string) => apiPost<TripRow>(`/trips/${id}/publish`, {}),
  unpublish: (id: string) => apiDelete(`/trips/${id}/publish`),
};
