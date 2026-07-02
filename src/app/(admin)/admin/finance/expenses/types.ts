import { fiscalYearOf } from "@/lib/fiscalYear";
import { todayInput } from "../format";

// Sentinel for "don't post a ledger entry" in the optional account dropdown.
export const NO_ACCOUNT = "";

export type ExpenseForm = {
  date: string;
  name: string;
  categoryId: string;
  isRecurring: boolean;
  amount: string;
  fiscalYear: string;
  notes: string;
  /** Optional Money account to post a linked DEBIT to (opt-in; create only). */
  accountId: string;
};

export const BLANK_EXPENSE_FORM: ExpenseForm = {
  date: todayInput(),
  name: "",
  categoryId: "",
  isRecurring: false,
  amount: "",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
  accountId: NO_ACCOUNT,
};
