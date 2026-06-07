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

// Property management
export type PaymentStatus = "PENDING" | "PAID" | "PARTIAL" | "OVERDUE";
export type IncomeCategory = "SALARY" | "FREELANCE" | "RENTAL" | "OTHER";
export type ExpenseCategory =
  | "MAINTENANCE"
  | "UTILITY"
  | "SALARY"
  | "SUBSCRIPTION"
  | "CONSTRUCTION"
  | "OTHER";
export type RenovationStatus =
  | "PLANNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export interface DashboardStats {
  totalUnits: number;
  occupiedUnits: number;
  monthlyRentCollected: number;
  monthlyRentExpected: number;
  overdueCount: number;
}
