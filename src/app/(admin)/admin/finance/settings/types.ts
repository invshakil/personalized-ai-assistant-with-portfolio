export type Kind = "employee" | "source" | "category";

export interface DrawerState {
  kind: Kind;
  editingId: string | null;
  name: string;
  phone: string;
  notes: string;
  isActive: boolean;
}

export const TITLE: Record<Kind, string> = {
  employee: "Employees",
  source: "Clients",
  category: "Expense Categories",
};
