// Property management — shared types (units, tenants, rent payments, expenses,
// services, dashboard). Re-exported through the @/types barrel.

// ── Enums ──
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
export type TransactionType = "CASH" | "BANK_TRANSFER" | "ADVANCE_APPLIED" | "ADJUSTMENT" | "OTHER";
export type TenantStatus = "CURRENT" | "FUTURE" | "PAST";
export type ExpenseCategory =
  | "MAINTENANCE"
  | "UTILITY"
  | "SALARY"
  | "SUBSCRIPTION"
  | "CONSTRUCTION"
  | "OTHER";
export type RenovationStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

// Property settings singleton
export interface PropertySettings {
  id: string;
  propertyName: string;
  ownerName: string;
  ownerPhone: string;
  address: string;
  bankAccount: string | null;
  updatedAt: string;
}

// ── Domain types ──
export interface UnitWithTenant {
  id: string;
  unitNumber: string;
  floor: string;
  monthlyRent: number;
  description: string | null;
  isOccupied: boolean;
  notes: string | null;
  tenant: TenantSummary | null; // current tenant
  futureTenant: TenantSummary | null; // scheduled future tenant (moveInDate in future)
}

export interface TenantSummary {
  id: string;
  tenantCode: string | null;
  name: string;
  phone: string | null;
  isActive: boolean;
  isExternal: boolean;
  tenantStatus: TenantStatus;
  moveInDate: string;
  moveOutDate?: string | null;
  leaseEndDate: string | null;
  advancePaid: boolean;
  advanceAmount: number;
  advanceSettled: boolean;
  services?: { id: string; serviceName: string; monthlyFee: number }[];
  scheduledRent?: number | null; // pending RentChange for FUTURE tenants
}

export interface TenantWithUnit extends TenantSummary {
  email: string | null;
  nidNumber: string | null;
  moveOutDate: string | null;
  notes: string | null;
  unit: { id: string; unitNumber: string; floor: string; monthlyRent: number } | null;
  services: TenantServiceWithName[];
  rentChanges: RentChange[];
}

export interface TenantServiceWithName {
  id: string;
  serviceId: string;
  serviceName: string;
  monthlyFee: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface AddOnService {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export interface RentChange {
  id: string;
  tenantId: string;
  effectiveDate: string;
  previousRent: number;
  newRent: number;
  reason: string | null;
  appliedAt: string | null;
}

export interface PaymentWithTenant {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string | null;
  unitId: string | null;
  unitNumber: string | null;
  month: number;
  year: number;
  rentDue: number;
  amountPaid: number;
  advanceApplied: number;
  carryForward: number;
  balance: number;
  status: PaymentStatus;
  paidDate: string | null;
  receiptNumber: string | null;
  notes: string | null;
  transactions: PaymentTransaction[];
  advanceBalance: number;
  services: { name: string; monthlyFee: number }[];
}

export interface PaymentTransaction {
  id: string;
  paymentId: string;
  type: TransactionType;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface Payee {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  nidNumber: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface PayeeDocument {
  id: string;
  payeeId: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  size: number;
  label: string | null;
  uploadedAt: string;
}

export interface PropertyServiceType {
  id: string;
  name: string;
  category: ExpenseCategory;
  description: string | null;
  isActive: boolean;
}

export interface PropertyExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  month: number;
  year: number;
  expenseDate: string | null;
  paidTo: string | null;
  paymentMode: string | null;
  unitId: string | null;
  unitNumber: string | null;
  payeeId: string | null;
  payeeName: string | null;
  serviceTypeId: string | null;
  serviceTypeName: string | null;
  notes: string | null;
}

export interface DueTenantEntry {
  tenantId: string;
  tenantCode: string | null;
  tenantName: string;
  unitNumber: string | null;
  totalDue: number;
  monthsUnpaid: number;
  lastPaidDate: string | null;
  alert: "OVERDUE" | "PENDING";
}

/** An upcoming, not-yet-applied scheduled rent change (with tenant context). */
export interface PendingRentChangeEntry {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCode: string | null;
  unitNumber: string | null;
  effectiveDate: string;
  previousRent: number;
  newRent: number;
  increase: number;
  reason: string | null;
}

/** A recent or upcoming tenant move-in / move-out, for the activity panel. */
export interface TenantMovement {
  tenantId: string;
  tenantName: string;
  tenantCode: string | null;
  unitNumber: string | null;
  date: string; // ISO move-in date (MOVE_IN) or move-out date (MOVE_OUT)
  kind: "MOVE_IN" | "MOVE_OUT";
  timing: "upcoming" | "recent"; // relative to today
  isNew: boolean; // MOVE_IN of a brand-new tenant (no prior tenancy)
}

export interface PropertyDashboardStats {
  month: number;
  year: number;
  totalExpected: number;
  totalCollected: number;
  totalExpenses: number;
  netProfit: number;
  activeTenantsCount: number;
  occupiedUnits: number;
  totalUnits: number;
  tenantsWithAdvance: number;
  totalAdvanceHeld: number;
  overdueCount: number;
  yearlyData: YearlyDataPoint[];
  topDue: DueTenantEntry[];
  pendingRentChanges: PendingRentChangeEntry[];
  tenantMovements: TenantMovement[];
}

export interface YearlyDataPoint {
  month: number;
  label: string;
  collected: number;
  expenses: number;
  netProfit: number;
}

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  monthlyRentCollected: number;
  monthlyRentExpected: number;
  overdueCount: number;
}
