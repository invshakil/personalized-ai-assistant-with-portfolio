// Typed client for the Money Manager API. Components call these instead of
// inlining fetch + URLs. Returns the unwrapped `data` payload; throws on error.
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "./client";
import type {
  MoneyAccountRow,
  MoneyAccountType,
  MoneyCategoryRow,
  MoneyCategoryKind,
  MoneyEntryRow,
  MoneyEntryDirection,
  MoneyEntryMethod,
  BeneficiaryRow,
  BeneficiaryDetail,
  ObligationRow,
  ObligationType,
  ObligationDirection,
  ObligationStatus,
  MoneyDashboardData,
  FxRateResult,
} from "@/types";

export interface AccountPayload {
  name: string;
  type: MoneyAccountType;
  currency?: string;
  openingBalance?: number;
  creditLimit?: number | null;
  isActive?: boolean;
  notes?: string | null;
}

export interface CategoryPayload {
  name: string;
  kind: MoneyCategoryKind;
  isActive?: boolean;
}

export interface EntryPayload {
  date: string;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  categoryId: string;
  accountId?: string | null;
  beneficiaryId?: string | null;
  obligationId?: string | null;
  description?: string | null;
  notes?: string | null;
  /** How a CREDIT arrived (cash/bank transfer/etc.); CREDIT-only. */
  method?: MoneyEntryMethod | null;
}

export interface TransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  description?: string | null;
  notes?: string | null;
  /** Destination amount (destination currency) — required for a cross-currency transfer. */
  toAmount?: number;
}

export interface ObligationPayload {
  type: ObligationType;
  direction?: ObligationDirection;
  amount: number;
  frequency?: string | null;
  startDate: string;
  endDate?: string | null;
  status?: ObligationStatus;
  notes?: string | null;
}

export interface PaymentPayload {
  amount: number;
  date: string;
  obligationId?: string | null;
  direction?: "DEBIT" | "CREDIT";
  accountId?: string | null;
  categoryId?: string | null;
  description?: string | null;
  notes?: string | null;
}

export interface EntryFilters {
  period?: string;
  from?: string;
  to?: string;
  categoryIds?: string[];
  accountIds?: string[];
  beneficiaryId?: string;
  currencies?: string[];
  /** Case-insensitive description search. */
  q?: string;
  direction?: MoneyEntryDirection;
  sortBy?: "date" | "amount" | "category";
  sortDir?: "asc" | "desc";
  limit?: number;
}

export interface RangeParams {
  period?: string;
  from?: string;
  to?: string;
}

// CSV import shapes
export interface ImportMapping {
  date: string;
  amount: string;
  direction?: string;
  defaultDirection?: "CREDIT" | "DEBIT";
  category?: string;
  defaultCategory?: string;
  account?: string;
  defaultAccountId?: string;
  description?: string;
  notes?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  date: string | null;
  direction: "CREDIT" | "DEBIT" | null;
  amount: number | null;
  categoryName: string | null;
  accountName: string | null;
  description: string | null;
  notes: string | null;
  duplicate: boolean;
  error: string | null;
}

export interface ImportPreviewResult {
  headers: string[];
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  errorRows: number;
  newCategories: string[];
  rows: ImportPreviewRow[];
}

export interface ImportBatchRow {
  id: string;
  fileName: string;
  rowCount: number;
  importedAt: string;
  currentEntryCount: number;
}

function qs(params: Record<string, string | string[] | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length > 0) sp.set(k, v.join(","));
    } else {
      sp.set(k, String(v));
    }
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const moneyApi = {
  // FX rate (BDT per 1 unit of `from`) — prefill for foreign transfers
  getFxRate: (from: string) => apiGet<FxRateResult>(`/fx-rate${qs({ from })}`),

  // Dashboard
  dashboard: (params: RangeParams = {}) =>
    apiGet<MoneyDashboardData>(`/money/dashboard${qs({ ...params })}`),

  // Accounts
  listAccounts: () => apiGet<MoneyAccountRow[]>("/money/accounts"),
  createAccount: (body: AccountPayload) => apiPost<MoneyAccountRow>("/money/accounts", body),
  updateAccount: (id: string, body: Partial<AccountPayload>) =>
    apiPut<MoneyAccountRow>(`/money/accounts/${id}`, body),
  deleteAccount: (id: string) =>
    apiDelete<{ deleted: boolean; error?: string }>(`/money/accounts/${id}`),

  // Categories
  listCategories: (kind?: MoneyCategoryKind) =>
    apiGet<MoneyCategoryRow[]>(`/money/categories${qs({ kind })}`),
  createCategory: (body: CategoryPayload) => apiPost<MoneyCategoryRow>("/money/categories", body),
  updateCategory: (id: string, body: Partial<CategoryPayload>) =>
    apiPut<MoneyCategoryRow>(`/money/categories/${id}`, body),
  deleteCategory: (id: string) =>
    apiDelete<{ deleted: boolean; error?: string }>(`/money/categories/${id}`),

  // Entries (ledger)
  listEntries: (filters: EntryFilters = {}) =>
    apiGet<MoneyEntryRow[]>(`/money/entries${qs({ ...filters })}`),
  createEntry: (body: EntryPayload) => apiPost<MoneyEntryRow>("/money/entries", body),
  updateEntry: (id: string, body: Partial<EntryPayload>) =>
    apiPut<MoneyEntryRow>(`/money/entries/${id}`, body),
  deleteEntry: (id: string) => apiDelete<{ deleted: boolean }>(`/money/entries/${id}`),

  // Transfers
  transfer: (body: TransferPayload) => apiPost<MoneyEntryRow>("/money/transfers", body),

  // Beneficiaries + obligations + payments
  listBeneficiaries: () => apiGet<BeneficiaryRow[]>("/money/beneficiaries"),
  getBeneficiary: (id: string) => apiGet<BeneficiaryDetail>(`/money/beneficiaries/${id}`),
  createBeneficiary: (body: {
    name: string;
    relationship?: string | null;
    phone?: string | null;
    notes?: string | null;
  }) => apiPost<BeneficiaryRow>("/money/beneficiaries", body),
  updateBeneficiary: (
    id: string,
    body: Partial<{
      name: string;
      relationship: string | null;
      phone: string | null;
      isActive: boolean;
      notes: string | null;
    }>
  ) => apiPut<BeneficiaryRow>(`/money/beneficiaries/${id}`, body),
  deleteBeneficiary: (id: string) =>
    apiDelete<{ deleted: boolean; error?: string }>(`/money/beneficiaries/${id}`),
  createObligation: (beneficiaryId: string, body: ObligationPayload) =>
    apiPost<ObligationRow>(`/money/beneficiaries/${beneficiaryId}/obligations`, body),
  updateObligation: (
    beneficiaryId: string,
    obligationId: string,
    body: Partial<ObligationPayload>
  ) =>
    apiPut<ObligationRow>(
      `/money/beneficiaries/${beneficiaryId}/obligations/${obligationId}`,
      body
    ),
  deleteObligation: (beneficiaryId: string, obligationId: string) =>
    apiDelete<{ deleted: boolean }>(
      `/money/beneficiaries/${beneficiaryId}/obligations/${obligationId}`
    ),
  recordPayment: (beneficiaryId: string, body: PaymentPayload) =>
    apiPost<MoneyEntryRow>(`/money/beneficiaries/${beneficiaryId}/payments`, body),

  // CSV import
  previewImport: (file: File, mapping: ImportMapping) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(mapping));
    return apiUpload<ImportPreviewResult>("/money/import/preview", fd);
  },
  commitImport: (file: File, mapping: ImportMapping, includeDuplicates = false) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(mapping));
    fd.append("includeDuplicates", String(includeDuplicates));
    return apiUpload<{ batchId: string; imported: number; skipped: number }>(
      "/money/import/commit",
      fd
    );
  },
  listImportBatches: () => apiGet<ImportBatchRow[]>("/money/import/batches"),
  deleteImportBatch: (id: string) =>
    apiDelete<{ deleted: boolean; removedEntries: number }>(`/money/import/batches/${id}`),
};
