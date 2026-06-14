// Client-side types for the Financial Tracker module — mirror the JSON shapes
// returned by the `/api/admin/finance/*` routes (see src/services/finance/).

export type RemittanceType = "REM" | "NON_REM";
export type PaymentKind = "SALARY" | "BONUS" | "ADVANCE" | "OTHER";

export interface EarningRow {
  id: string;
  date: string;
  sourceId: string;
  sourceName: string;
  remittance: RemittanceType;
  amount: number;
  fiscalYear: string;
  notes: string | null;
}

export interface PaymentRow {
  id: string;
  date: string;
  employeeId: string;
  employeeName: string;
  type: PaymentKind;
  reference: string | null;
  clients: { id: string; name: string }[];
  amount: number;
  fiscalYear: string;
  notes: string | null;
}

export interface BizExpenseRow {
  id: string;
  date: string;
  name: string;
  categoryId: string;
  categoryName: string;
  isRecurring: boolean;
  amount: number;
  fiscalYear: string;
  notes: string | null;
  subscriptionId: string | null;
}

export interface SubscriptionRow {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  monthlyAmount: number;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  notes: string | null;
  monthsCharged: number;
  totalSpent: number;
}

export interface SubscriptionCharge {
  id: string;
  date: string | null;
  amount: number;
  fiscalYear: string;
}

export interface SubscriptionDetail extends Omit<SubscriptionRow, "monthsCharged"> {
  charges: SubscriptionCharge[];
}

export interface EmployeeRow {
  id: string;
  name: string;
  phone: string | null;
  isActive: boolean;
  notes: string | null;
  paymentCount: number;
  totalPaid: number;
}

export interface SourceRow {
  id: string;
  name: string;
  notes: string | null;
  earningCount: number;
}

export interface CategoryRow {
  id: string;
  name: string;
  expenseCount: number;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
}

export interface FinanceDashboardData {
  fiscalYears: string[];
  pnl: {
    fiscalYear: string;
    income: number;
    empCosts: number;
    toolSubs: number;
    netProfit: number;
    margin: number;
  }[];
  totals: {
    income: number;
    empCosts: number;
    toolSubs: number;
    netProfit: number;
    margin: number;
  };
  byEmployee: {
    employeeId: string;
    name: string;
    byFiscalYear: Record<string, number>;
    total: number;
  }[];
  bySource: { sourceId: string; name: string; total: number; count: number }[];
  remittance: { rem: number; nonRem: number };
  monthlyIncome: { period: string; amount: number }[];
}
