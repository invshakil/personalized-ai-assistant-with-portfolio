// Admin surface — shared types (assistant chat, dashboard overview, database
// backups, theme preferences). Re-exported through the @/types barrel.

// ── Assistant chat ──
export interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Overview (dashboard) ──
interface OverviewMoney {
  income: number;
  costs: number; // salaries + expenses
  salaries: number;
  expenses: number;
  net: number;
}

export interface AdminOverview {
  monthLabel: string; // "June 2026"
  fiscalYear: string; // "2025-2026"
  finance: {
    month: OverviewMoney;
    fiscalYear: OverviewMoney;
    subscriptionRunRate: number; // current-month effective ৳/mo
    subscriptionCount: number;
  };
  property: {
    collected: number;
    expected: number;
    expenses: number;
    net: number;
    occupiedUnits: number;
    totalUnits: number;
    overdueCount: number;
    totalDue: number;
    topDue: {
      tenantName: string;
      unitNumber: string | null;
      totalDue: number;
      monthsUnpaid: number;
      alert: "OVERDUE" | "PENDING";
    }[];
  };
  money: {
    income: number; // this month, ledger CREDIT into INCOME categories
    expense: number; // this month, ledger DEBIT from EXPENSE categories
    savings: number; // income - expense
    savingsRate: number; // 0..1
    cashPosition: number; // sum of non-CC account balances
    cardDebt: number; // |sum of CC account negative balances|
    owedByMe: number; // money you owe people
    owedToMe: number; // money people owe you
    topCategory: { id: string; name: string; total: number } | null;
  };
}

// ── Database backups ──
export type BackupFrequency = "off" | "daily" | "weekly";

export interface AdminBackupSettings {
  frequency: BackupFrequency;
  retentionCount: number;
  lastRunAt: string | null;
  lastStatus: "ok" | "error" | null;
  lastError: string | null;
  driveConnected: boolean;
  driveEmail: string | null;
}

export interface AdminBackupRecord {
  id: string;
  filename: string;
  sizeBytes: number;
  location: "local" | "local+drive" | "drive";
  driveFileId: string | null;
  trigger: "manual" | "scheduled";
  status: "ok" | "error";
  error: string | null;
  createdAt: string;
}

export interface AdminBackupState {
  settings: AdminBackupSettings;
  records: AdminBackupRecord[];
  driveConfigured: boolean; // OAuth client env present
  backupDir: string; // absolute server path where dumps live (for restore command)
  databaseName: string; // target DB name (for restore command)
}

// ── Theme preferences ──
export type ThemeMode = "light" | "dark" | "system";
export type CardShadow = "none" | "soft" | "elevated";
export type Density = "compact" | "comfortable";

export interface AdminThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  cardShadow: CardShadow;
  cardBorder: boolean;
  borderRadius: number;
  density: Density;
  fontSize: number;
}
