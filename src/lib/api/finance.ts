// Typed client for the Financial Tracker API. Components call these instead of
// inlining fetch + URLs. Returns the unwrapped `data` payload; throws on error.
import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type {
  EarningRow,
  PaymentRow,
  BizExpenseRow,
  EmployeeRow,
  SourceRow,
  CategoryRow,
  SubscriptionRow,
  SubscriptionDetail,
  FinanceDashboardData,
  BusinessProfile,
  RemittanceType,
  PaymentKind,
} from "@/app/(admin)/admin/finance/types";
import type { FxRateResult } from "@/types";

export interface EarningPayload {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  /** BDT-equivalent (canonical). Derived server-side from originalAmount × fxRate. */
  amount?: number;
  /** Original currency (BDT | USD | EUR). */
  currency?: string;
  /** Amount in `currency`. */
  originalAmount?: number;
  /** BDT per 1 unit of `currency`. */
  fxRate?: number;
  fiscalYear?: string;
  notes?: string | null;
  /** Opt-in cross-domain link: post a CREDIT to this Money account (create only). */
  accountId?: string;
}

export interface PaymentPayload {
  date: string;
  employeeId: string;
  type: PaymentKind;
  reference?: string | null;
  clientIds?: string[];
  /** BDT-equivalent (canonical). Derived server-side from originalAmount × fxRate. */
  amount?: number;
  /** Original currency (BDT | USD | EUR). */
  currency?: string;
  /** Amount in `currency`. */
  originalAmount?: number;
  /** BDT per 1 unit of `currency`. */
  fxRate?: number;
  fiscalYear?: string;
  notes?: string | null;
  /** Opt-in cross-domain link: post a DEBIT to this Money account (create only). */
  accountId?: string;
}

export interface BizExpensePayload {
  date: string;
  name: string;
  categoryId: string;
  isRecurring?: boolean;
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
  /** Opt-in cross-domain link: post a DEBIT to this Money account (create only). */
  accountId?: string;
}

export interface ConvertEarningsPayload {
  earningIds: string[];
  fromAccountId: string;
  toAccountId: string;
  date: string;
  toAmount: number;
  notes?: string | null;
}

export interface SubscriptionPayload {
  name: string;
  categoryId: string;
  monthlyAmount: number;
  startDate: string;
  notes?: string | null;
}

// ── List filters (mirror the service `where` options) ─────────────────────────

export interface EarningFilters {
  fiscalYear?: string;
  sourceId?: string;
  /** Relative period token (resolved server-side) — e.g. "last_3_months". */
  period?: string;
  from?: string;
  to?: string;
  /** Case-insensitive search over notes + the remittance type label. */
  q?: string;
}

export interface PaymentFilters {
  fiscalYear?: string;
  employeeId?: string;
  /** IncomeSource id this salary is attributed to. */
  clientId?: string;
  type?: PaymentKind;
  period?: string;
  from?: string;
  to?: string;
}

export interface BizExpenseFilters {
  fiscalYear?: string;
  categoryId?: string;
  period?: string;
  from?: string;
  to?: string;
  /** Case-insensitive search over the tool/service name. */
  q?: string;
}

export interface SubscriptionFilters {
  categoryId?: string;
  /** Case-insensitive search over the service name. */
  q?: string;
}

export interface RateChangePayload {
  effectiveMonth: string; // yyyy-mm
  monthlyAmount: number;
  note?: string | null;
}

export interface OverridePayload {
  month: string; // yyyy-mm
  amount: number;
  note?: string | null;
}

export const financeApi = {
  // ── FX rate (BDT per 1 unit of `from`) — prefill foreign transactions ─────
  getFxRate: (from: string) => apiGet<FxRateResult>("/fx-rate", { params: { from } }),

  // ── Dashboard ──────────────────────────────────────────────────────────
  dashboard: (params?: { from?: string; to?: string }) =>
    apiGet<FinanceDashboardData>("/finance/dashboard", { params }),

  // ── Earnings ───────────────────────────────────────────────────────────
  listEarnings: (params?: EarningFilters) => apiGet<EarningRow[]>("/finance/earnings", { params }),
  createEarning: (body: EarningPayload) => apiPost<EarningRow>("/finance/earnings", body),
  updateEarning: (id: string, body: Partial<EarningPayload>) =>
    apiPut<EarningRow>(`/finance/earnings/${id}`, body),
  deleteEarning: (id: string) => apiDelete(`/finance/earnings/${id}`),
  // Realize pending foreign earnings → BDT (one cross-currency transfer for the batch).
  convertEarnings: (body: ConvertEarningsPayload) =>
    apiPost<{ converted: number; currency: string; toAmount: number; rate: number }>(
      "/finance/earnings/convert",
      body
    ),
  reverseConversion: (id: string) =>
    apiPost<{ reversed: boolean }>(`/finance/earnings/${id}/reverse-conversion`, {}),

  // ── Employee salary payments ─────────────────────────────────────────────
  listPayments: (params?: PaymentFilters) => apiGet<PaymentRow[]>("/finance/payments", { params }),
  createPayment: (body: PaymentPayload) => apiPost<PaymentRow>("/finance/payments", body),
  updatePayment: (id: string, body: Partial<PaymentPayload>) =>
    apiPut<PaymentRow>(`/finance/payments/${id}`, body),
  deletePayment: (id: string) => apiDelete(`/finance/payments/${id}`),

  // ── Business expenses ────────────────────────────────────────────────────
  listExpenses: (params?: BizExpenseFilters) =>
    apiGet<BizExpenseRow[]>("/finance/expenses", { params }),
  createExpense: (body: BizExpensePayload) => apiPost<BizExpenseRow>("/finance/expenses", body),
  updateExpense: (id: string, body: Partial<BizExpensePayload>) =>
    apiPut<BizExpenseRow>(`/finance/expenses/${id}`, body),
  deleteExpense: (id: string) => apiDelete(`/finance/expenses/${id}`),

  // ── Subscriptions ──────────────────────────────────────────────────────
  listSubscriptions: (params?: SubscriptionFilters) =>
    apiGet<SubscriptionRow[]>("/finance/subscriptions", { params }),
  getSubscription: (id: string) => apiGet<SubscriptionDetail>(`/finance/subscriptions/${id}`),
  createSubscription: (body: SubscriptionPayload) =>
    apiPost<{ id: string }>("/finance/subscriptions", body),
  updateSubscription: (id: string, body: Partial<SubscriptionPayload>) =>
    apiPut(`/finance/subscriptions/${id}`, body),
  deleteSubscription: (id: string) => apiDelete(`/finance/subscriptions/${id}`),
  stopSubscription: (id: string, endDate?: string) =>
    apiPost(`/finance/subscriptions/${id}/stop`, endDate ? { endDate } : {}),
  resumeSubscription: (id: string) =>
    apiPost(`/finance/subscriptions/${id}/stop`, { resume: true }),
  // Effective-dated price changes (hikes/drops)
  addRateChange: (id: string, body: RateChangePayload) =>
    apiPost(`/finance/subscriptions/${id}/rate-changes`, body),
  deleteRateChange: (id: string, rcId: string) =>
    apiDelete(`/finance/subscriptions/${id}/rate-changes/${rcId}`),
  // Per-month amount overrides (discounts/coupons)
  setOverride: (id: string, body: OverridePayload) =>
    apiPut(`/finance/subscriptions/${id}/overrides`, body),
  clearOverride: (id: string, month: string) =>
    apiDelete(`/finance/subscriptions/${id}/overrides`, { data: { month } }),

  // ── Config: employees / clients (sources) / categories ───────────────────
  listEmployees: () => apiGet<EmployeeRow[]>("/finance/employees"),
  createEmployee: (body: {
    name: string;
    phone?: string | null;
    isActive?: boolean;
    notes?: string | null;
  }) => apiPost<EmployeeRow>("/finance/employees", body),
  updateEmployee: (
    id: string,
    body: { name?: string; phone?: string | null; isActive?: boolean; notes?: string | null }
  ) => apiPut<EmployeeRow>(`/finance/employees/${id}`, body),
  deleteEmployee: (id: string) => apiDelete(`/finance/employees/${id}`),

  listClients: () => apiGet<SourceRow[]>("/finance/sources"),
  createClient: (body: { name: string; notes?: string | null }) =>
    apiPost<SourceRow>("/finance/sources", body),
  updateClient: (id: string, body: { name?: string; notes?: string | null }) =>
    apiPut<SourceRow>(`/finance/sources/${id}`, body),
  deleteClient: (id: string) => apiDelete(`/finance/sources/${id}`),

  // ── Business profile (PDF letterhead) ────────────────────────────────────
  getBusinessProfile: () => apiGet<BusinessProfile>("/finance/business-profile"),
  updateBusinessProfile: (body: Partial<BusinessProfile>) =>
    apiPut<BusinessProfile>("/finance/business-profile", body),

  listCategories: () => apiGet<CategoryRow[]>("/finance/categories"),
  createCategory: (body: { name: string }) => apiPost<CategoryRow>("/finance/categories", body),
  updateCategory: (id: string, body: { name?: string }) =>
    apiPut<CategoryRow>(`/finance/categories/${id}`, body),
  deleteCategory: (id: string) => apiDelete(`/finance/categories/${id}`),
};
