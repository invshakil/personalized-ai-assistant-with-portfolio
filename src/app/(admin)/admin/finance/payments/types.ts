import { fiscalYearOf } from "@/lib/fiscalYear";
import { todayInput } from "../format";
import type { PaymentKind } from "../types";

export const KINDS: PaymentKind[] = ["SALARY", "BONUS", "ADVANCE", "OTHER"];
export const KIND_LABEL: Record<PaymentKind, string> = {
  SALARY: "Salary",
  BONUS: "Bonus",
  ADVANCE: "Advance",
  OTHER: "Other",
};

// Sentinel for "don't post a ledger entry" in the optional account dropdown.
export const NO_ACCOUNT = "";

export type PaymentForm = {
  date: string;
  employeeId: string;
  type: PaymentKind;
  reference: string;
  clientIds: string[];
  /** Amount in the chosen currency (= BDT amount when currency is BDT). */
  amount: string;
  currency: string;
  /** BDT per 1 unit of `currency`; "1" for BDT. */
  fxRate: string;
  fiscalYear: string;
  notes: string;
  /** Optional Money account to post a linked DEBIT to (opt-in; create only). */
  accountId: string;
};

export const BLANK: PaymentForm = {
  date: todayInput(),
  employeeId: "",
  type: "SALARY",
  reference: "",
  clientIds: [],
  amount: "",
  currency: "BDT",
  fxRate: "1",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
  accountId: NO_ACCOUNT,
};
