export type { PaymentStatus, IncomeCategory } from "@/types/index";

// Sentinel for the optional "don't add advance to wallet" choice.
export const NO_ACCOUNT = "";

export function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

// Given a YYYY-MM-DD string, return the calendar day before it (also YYYY-MM-DD).
// Parse and step in UTC so the result is timezone-independent (a local parse +
// toISOString() can shift the date by a day in non-UTC zones).
export function dayBefore(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export interface UnitForm {
  unitNumber: string;
  floor: string;
  monthlyRent: string;
  description: string;
  notes: string;
}

export interface TenantForm {
  name: string;
  phone: string;
  moveInDate: string;
  leaseEndDate: string;
  advancePaid: boolean;
  advanceAmount: string;
}

export interface RentChangeForm {
  effectiveDate: string;
  newRent: string;
  reason: string;
}

export interface AddTenantForm {
  name: string;
  phone: string;
  unitId: string;
  customRent: string;
  moveInDate: string;
  leaseEndDate: string;
  advancePaid: boolean;
  advanceAmount: string;
  outgoingMoveOutDate: string;
}

export const BLANK_ADD_TENANT_FORM: AddTenantForm = {
  name: "",
  phone: "",
  unitId: "",
  customRent: "",
  moveInDate: "",
  leaseEndDate: "",
  advancePaid: false,
  advanceAmount: "",
  outgoingMoveOutDate: "",
};

// URL <-> tab-index mapping for the three top-level tabs.
export const TAB_KEYS = ["units", "tenants", "external"] as const;
export type TabKey = (typeof TAB_KEYS)[number];
