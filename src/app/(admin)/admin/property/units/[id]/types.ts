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

export type TenantHistory = {
  id: string;
  tenantCode: string | null;
  name: string;
  phone: string | null;
  isActive: boolean;
  tenantStatus: string;
  moveInDate: string;
  moveOutDate: string | null;
  leaseEndDate: string | null;
  advancePaid: boolean;
  advanceAmount: number;
  advanceSettled: boolean;
  scheduledRent?: number | null;
};

export type UnitDetail = {
  id: string;
  unitNumber: string;
  floor: string;
  monthlyRent: number;
  description: string | null;
  notes: string | null;
  isOccupied: boolean;
  tenants: TenantHistory[];
};

export interface AddFutureForm {
  name: string;
  phone: string;
  moveInDate: string;
  leaseEndDate: string;
  advancePaid: boolean;
  advanceAmount: string;
  newRent: string;
  outgoingMoveOutDate: string;
}

export const BLANK_ADD_FUTURE_FORM: AddFutureForm = {
  name: "",
  phone: "",
  moveInDate: "",
  leaseEndDate: "",
  advancePaid: false,
  advanceAmount: "",
  newRent: "",
  outgoingMoveOutDate: "",
};

export interface UnitEditForm {
  unitNumber: string;
  floor: string;
  monthlyRent: string;
  description: string;
  notes: string;
}
