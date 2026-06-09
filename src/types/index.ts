// Extend next-auth session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }
}

// Property management — enums
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
export type TransactionType = "CASH" | "BANK_TRANSFER" | "ADVANCE_APPLIED" | "ADJUSTMENT" | "OTHER";
export type IncomeCategory = "SALARY" | "FREELANCE" | "RENTAL" | "OTHER";
export type ExpenseCategory =
  | "MAINTENANCE"
  | "UTILITY"
  | "SALARY"
  | "SUBSCRIPTION"
  | "CONSTRUCTION"
  | "OTHER";
export type RenovationStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

// Property management — domain types
export interface UnitWithTenant {
  id: string;
  unitNumber: string;
  floor: string;
  monthlyRent: number;
  description: string | null;
  isOccupied: boolean;
  notes: string | null;
  tenant: TenantSummary | null;
}

export interface TenantSummary {
  id: string;
  tenantCode: string | null;
  name: string;
  phone: string | null;
  isActive: boolean;
  isExternal: boolean;
  moveInDate: string;
  leaseEndDate: string | null;
  advancePaid: boolean;
  advanceAmount: number;
  advanceSettled: boolean;
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
  balance: number;
  status: PaymentStatus;
  paidDate: string | null;
  receiptNumber: string | null;
  notes: string | null;
  transactions: PaymentTransaction[];
  advanceBalance: number;
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
  pendingRentChanges: RentChange[];
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

// ── Admin chat types ──

export interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Portfolio component types ──

export interface SkillGroup {
  name: string;
  tags: string[];
}

export interface ExperienceEntry {
  badge: string;
  isCurrent: boolean;
  role: string;
  company: string;
  summary: string;
  bullets: string[];
}

export interface Project {
  num: string;
  title: string;
  description: string;
  tech: string[];
  footer: {
    label: string;
    icon: "lock" | "heart";
    link?: string;
  };
}

export interface EducationItem {
  years: string;
  degree: string;
  institution: string;
}

export interface Testimonial {
  rating: number;
  date: string;
  quote: string;
  tags: string[];
  project: string;
  source: string;
}

export type ContactIconType = "email" | "linkedin" | "github" | "whatsapp" | "cv";

export interface ContactLink {
  label: string;
  value: string;
  href: string;
  icon: ContactIconType;
}
