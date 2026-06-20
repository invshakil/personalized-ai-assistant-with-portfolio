// Typed client for the Property Management API. Components call these instead
// of inlining fetch + URLs. Returns the unwrapped `data`; throws on error.
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "./client";
import type {
  UnitWithTenant,
  TenantWithUnit,
  PaymentWithTenant,
  PropertyExpense,
  Payee,
  PayeeDocument,
  PropertyServiceType,
  PropertySettings,
  PropertyDashboardStats,
} from "@/types";

type TenantFilter = "active" | "inactive" | "all";

/** Extra server-side filters for the tenants list (unit, status, name/phone search). */
export interface TenantListFilters {
  filter?: TenantFilter;
  unitId?: string;
  status?: "CURRENT" | "FUTURE";
  /** Case-insensitive search on tenant name or phone. */
  q?: string;
}

export const propertyApi = {
  // ── Units ────────────────────────────────────────────────────────────────
  listUnits: () => apiGet<UnitWithTenant[]>("/property/units"),
  getUnit: <T = unknown>(id: string) => apiGet<T>(`/property/units/${id}`),
  updateUnit: (id: string, body: unknown) => apiPut(`/property/units/${id}`, body),

  // ── Tenants ──────────────────────────────────────────────────────────────
  // Accepts the legacy bare filter string or a richer filters object
  // ({ filter, unitId, status, q }). All filtering happens server-side.
  listTenants: (arg?: TenantFilter | TenantListFilters) => {
    const params: TenantListFilters = typeof arg === "string" ? { filter: arg } : (arg ?? {});
    return apiGet<TenantWithUnit[]>("/property/tenants", { params });
  },
  getTenant: <T = unknown>(id: string) => apiGet<T>(`/property/tenants/${id}`),
  createTenant: (body: unknown) => apiPost("/property/tenants", body),
  updateTenant: (id: string, body: unknown) => apiPut(`/property/tenants/${id}`, body),
  activateTenant: (id: string) => apiPost(`/property/tenants/${id}/activate`),
  deactivateTenant: (id: string, body?: unknown) =>
    apiPost(`/property/tenants/${id}/deactivate`, body),
  addRentChange: (id: string, body: unknown) =>
    apiPost(`/property/tenants/${id}/rent-change`, body),
  autoDeactivateExpired: () => apiPost("/property/tenants/auto-deactivate-expired"),

  // ── Tenant documents ───────────────────────────────────────────────────
  listTenantDocuments: (tenantId: string) => apiGet(`/property/tenants/${tenantId}/documents`),
  uploadTenantDocuments: (tenantId: string, formData: FormData) =>
    apiUpload(`/property/tenants/${tenantId}/documents`, formData),
  deleteTenantDocument: (tenantId: string, docId: string) =>
    apiDelete(`/property/tenants/${tenantId}/documents/${docId}`),

  // ── Payments ─────────────────────────────────────────────────────────────
  listPayments: (params?: {
    month?: number;
    year?: number;
    tenantId?: string;
    unitId?: string;
    period?: string;
    from?: string;
    to?: string;
  }) => apiGet<PaymentWithTenant[]>("/property/payments", { params }),
  generatePayments: (body?: unknown) => apiPost("/property/payments/generate", body),
  updatePayment: (id: string, body: unknown) => apiPut(`/property/payments/${id}`, body),
  deletePayment: (id: string) => apiDelete(`/property/payments/${id}`),
  listPaymentTransactions: (paymentId: string) =>
    apiGet(`/property/payments/${paymentId}/transactions`),
  addPaymentTransaction: (paymentId: string, body: unknown) =>
    apiPost(`/property/payments/${paymentId}/transactions`, body),
  updatePaymentTransaction: (txId: string, body: unknown) =>
    apiPut(`/property/payments/transactions/${txId}`, body),
  deletePaymentTransaction: (txId: string) => apiDelete(`/property/payments/transactions/${txId}`),

  // ── Rent changes ─────────────────────────────────────────────────────────
  updateRentChange: (rcId: string, body: unknown) => apiPut(`/property/rent-changes/${rcId}`, body),
  deleteRentChange: (rcId: string) => apiDelete(`/property/rent-changes/${rcId}`),

  // ── Services + per-tenant assignment ──────────────────────────────────────
  listServices: () => apiGet("/property/services"),
  createService: (body: unknown) => apiPost("/property/services", body),
  updateService: (id: string, body: unknown) => apiPut(`/property/services/${id}`, body),
  deleteService: (id: string) => apiDelete(`/property/services/${id}`),
  assignService: (body: unknown) => apiPost("/property/services/assign", body),
  updateAssignedService: (id: string, body: unknown) =>
    apiPut(`/property/services/assign/${id}`, body),
  removeAssignedService: (id: string) => apiDelete(`/property/services/assign/${id}`),

  // ── Expenses ─────────────────────────────────────────────────────────────
  listExpenses: (params?: {
    month?: number;
    year?: number;
    payeeId?: string;
    category?: string;
    serviceTypeId?: string;
    q?: string;
  }) => apiGet<PropertyExpense[]>("/property/expenses", { params }),
  createExpense: (body: unknown) => apiPost("/property/expenses", body),
  updateExpense: (id: string, body: unknown) => apiPut(`/property/expenses/${id}`, body),
  deleteExpense: (id: string) => apiDelete(`/property/expenses/${id}`),

  // ── Dashboard + settings ──────────────────────────────────────────────────
  dashboard: (params?: { month?: number; year?: number }) =>
    apiGet<PropertyDashboardStats>("/property/dashboard", { params }),
  getSettings: () => apiGet<PropertySettings>("/property/settings"),
  updateSettings: (body: unknown) => apiPut<PropertySettings>("/property/settings", body),

  // ── Payees ───────────────────────────────────────────────────────────────
  listPayees: () => apiGet<Payee[]>("/property/payees"),
  getPayee: <T = unknown>(id: string) => apiGet<T>(`/property/payees/${id}`),
  createPayee: (body: unknown) => apiPost<Payee>("/property/payees", body),
  updatePayee: (id: string, body: unknown) => apiPut<Payee>(`/property/payees/${id}`, body),
  deletePayee: (id: string) => apiDelete(`/property/payees/${id}`),
  listPayeeDocuments: (payeeId: string) =>
    apiGet<PayeeDocument[]>(`/property/payees/${payeeId}/documents`),
  uploadPayeeDocuments: (payeeId: string, formData: FormData) =>
    apiUpload(`/property/payees/${payeeId}/documents`, formData),
  deletePayeeDocument: (payeeId: string, docId: string) =>
    apiDelete(`/property/payees/${payeeId}/documents/${docId}`),

  // ── Service types ──────────────────────────────────────────────────────
  listServiceTypes: () => apiGet<PropertyServiceType[]>("/property/service-types"),
  createServiceType: (body: unknown) =>
    apiPost<PropertyServiceType>("/property/service-types", body),
  updateServiceType: (id: string, body: unknown) =>
    apiPut<PropertyServiceType>(`/property/service-types/${id}`, body),
  deleteServiceType: (id: string) => apiDelete(`/property/service-types/${id}`),
};
