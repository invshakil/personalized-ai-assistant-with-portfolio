import { fiscalYearOf } from "@/lib/fiscalYear";
import { todayInput } from "../format";
import type { RemittanceType } from "../types";

export const REMITTANCE_LABEL: Record<RemittanceType, string> = {
  REM: "Remittance",
  NON_REM: "Non-rem",
};

// Sentinel for "don't post a ledger entry" in the optional account dropdown.
export const NO_ACCOUNT = "";

export type EarningForm = {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  /** Amount in the chosen currency (= BDT amount when currency is BDT). */
  amount: string;
  currency: string;
  /** BDT per 1 unit of `currency`; "1" for BDT. */
  fxRate: string;
  fiscalYear: string;
  notes: string;
  /** Optional Money account to post a linked CREDIT to (opt-in; create only). */
  accountId: string;
};

export const BLANK_EARNING_FORM: EarningForm = {
  date: todayInput(),
  sourceId: "",
  remittance: "REM",
  amount: "",
  currency: "BDT",
  fxRate: "1",
  fiscalYear: fiscalYearOf(new Date()),
  notes: "",
  accountId: NO_ACCOUNT,
};
