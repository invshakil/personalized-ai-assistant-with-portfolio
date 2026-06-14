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

export interface EarningPayload {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
}

export interface PaymentPayload {
  date: string;
  employeeId: string;
  type: PaymentKind;
  reference?: string | null;
  clientIds?: string[];
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
}

export interface BizExpensePayload {
  date: string;
  name: string;
  categoryId: string;
  isRecurring?: boolean;
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
}

export interface SubscriptionPayload {
  name: string;
  categoryId: string;
  monthlyAmount: number;
  startDate: string;
  notes?: string | null;
}

export const financeApi = {
  // ── Dashboard ──────────────────────────────────────────────────────────
  dashboard: (params?: { from?: string; to?: string }) =>
    apiGet<FinanceDashboardData>("/finance/dashboard", { params }),

  // ── Earnings ───────────────────────────────────────────────────────────
  listEarnings: (params?: { fiscalYear?: string; sourceId?: string }) =>
    apiGet<EarningRow[]>("/finance/earnings", { params }),
  createEarning: (body: EarningPayload) => apiPost<EarningRow>("/finance/earnings", body),
  updateEarning: (id: string, body: Partial<EarningPayload>) =>
    apiPut<EarningRow>(`/finance/earnings/${id}`, body),
  deleteEarning: (id: string) => apiDelete(`/finance/earnings/${id}`),

  // ── Employee salary payments ─────────────────────────────────────────────
  listPayments: (params?: { fiscalYear?: string; employeeId?: string }) =>
    apiGet<PaymentRow[]>("/finance/payments", { params }),
  createPayment: (body: PaymentPayload) => apiPost<PaymentRow>("/finance/payments", body),
  updatePayment: (id: string, body: Partial<PaymentPayload>) =>
    apiPut<PaymentRow>(`/finance/payments/${id}`, body),
  deletePayment: (id: string) => apiDelete(`/finance/payments/${id}`),

  // ── Business expenses ────────────────────────────────────────────────────
  listExpenses: (params?: { fiscalYear?: string; categoryId?: string }) =>
    apiGet<BizExpenseRow[]>("/finance/expenses", { params }),
  createExpense: (body: BizExpensePayload) => apiPost<BizExpenseRow>("/finance/expenses", body),
  updateExpense: (id: string, body: Partial<BizExpensePayload>) =>
    apiPut<BizExpenseRow>(`/finance/expenses/${id}`, body),
  deleteExpense: (id: string) => apiDelete(`/finance/expenses/${id}`),

  // ── Subscriptions ──────────────────────────────────────────────────────
  listSubscriptions: () => apiGet<SubscriptionRow[]>("/finance/subscriptions"),
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
