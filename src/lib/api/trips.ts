// Client API for the Trip Expense Manager. Components/hooks call these instead of
// inlining fetch + URLs. URLs are relative to the client baseURL (/api/admin).
import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  MoneyEntryRow,
  TripBudgetRow,
  TripCategory,
  TripReport,
  TripRow,
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

export interface TripExpensePayload {
  category: TripCategory;
  accountId: string;
  amount: number;
  date: string;
  description?: string | null;
  notes?: string | null;
  fxRate?: number;
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

  listExpenses: (id: string) => apiGet<MoneyEntryRow[]>(`/trips/${id}/expenses`),
  createExpense: (id: string, body: TripExpensePayload) =>
    apiPost<MoneyEntryRow>(`/trips/${id}/expenses`, body),
  updateExpense: (id: string, entryId: string, body: Partial<TripExpensePayload>) =>
    apiPut<MoneyEntryRow>(`/trips/${id}/expenses/${entryId}`, body),
  deleteExpense: (id: string, entryId: string) => apiDelete(`/trips/${id}/expenses/${entryId}`),

  fundWallet: (id: string, body: FundWalletPayload) =>
    apiPost<MoneyEntryRow>(`/trips/${id}/fund`, body),

  getReport: (id: string) => apiGet<TripReport>(`/trips/${id}/report`),

  publish: (id: string) => apiPost<TripRow>(`/trips/${id}/publish`, {}),
  unpublish: (id: string) => apiDelete(`/trips/${id}/publish`),
};
