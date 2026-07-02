import { thisMonthInput } from "../format";

export type SubForm = {
  name: string;
  categoryId: string;
  monthlyAmount: string;
  startMonth: string; // yyyy-mm
  notes: string;
};

export const BLANK: SubForm = {
  name: "",
  categoryId: "",
  monthlyAmount: "",
  startMonth: thisMonthInput(),
  notes: "",
};

export type RcForm = {
  effectiveMonth: string;
  monthlyAmount: string;
  note: string;
};

export const BLANK_RC_FORM: RcForm = {
  effectiveMonth: thisMonthInput(),
  monthlyAmount: "",
  note: "",
};

export interface AdjustingState {
  chargeId: string;
  amount: string;
  note: string;
}

// Derive a "yyyy-mm" input value from a (UTC) ISO date using LOCAL components,
// so it matches how the month is displayed (fmtMonth) and round-trips back to
// the server correctly regardless of timezone. Slicing the raw ISO string is
// unsafe — it's UTC and shifts the month in non-UTC zones.
export const monthInput = (iso: string | null): string => {
  if (!iso) return thisMonthInput();
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
