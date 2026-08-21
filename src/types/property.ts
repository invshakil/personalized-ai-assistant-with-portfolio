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

/** Payload for moving a tenant to a different unit, with optional rent/service changes. */
export interface MoveTenantInput {
  newUnitId: string;
  moveDate?: string;
  newRent?: number;
  reason?: string | null;
  endServiceIds?: string[];
  newServices?: {
    serviceId: string;
    monthlyFee: number;
    startDate?: string;
    notes?: string | null;
  }[];
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
  tenantPhone: string | null;
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
  oneOffCharges: PaymentOneOffCharge[];
  vouchers: PaymentVoucher[];
}

/** A one-time charge (maintenance fee, repair, etc.) billed for one month. */
export interface OneOffCharge {
  id: string;
  tenantId: string;
  label: string;
  amount: number;
  month: number;
  year: number;
  notes: string | null;
  createdAt: string | null;
}

/** One-off charge as surfaced inside a payment's bill breakdown. */
export interface PaymentOneOffCharge {
  id: string;
  label: string;
  amount: number;
  notes: string | null;
}

/** A credit applied against one month's bill — a discount, or a reimbursement
 *  for a cost the tenant fronted that the landlord owes. Stored positive and
 *  SUBTRACTED from rentDue (the mirror of OneOffCharge). */
export interface Voucher {
  id: string;
  tenantId: string;
  label: string;
  amount: number;
  month: number;
  year: number;
  notes: string | null;
  createdAt: string | null;
}

/** Voucher as surfaced inside a payment's bill breakdown. */
export interface PaymentVoucher {
  id: string;
  label: string;
  amount: number;
  notes: string | null;
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
  /** Cash/bank actually received this month. Excludes advance draw-down. */
  totalCollected: number;
  /** Drawn from tenants' held advances — covers a bill but is not new cash. */
  totalAdvanceApplied: number;
  /** How much of the bill is covered, however it was covered (cash + advance).
   *  Coverage ratios use this; `totalCollected` answers "what cash came in". */
  totalSettled: number;
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
  /** Cash received in the month (excludes advance draw-down). */
  collected: number;
  advanceApplied: number;
  /** collected + advanceApplied — what the month's bills were covered by. */
  settled: number;
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
