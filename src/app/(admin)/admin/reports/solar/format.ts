// Display formatting for the Solar Reports page. Energy is always kWh; money
// follows the currency the overview reports (BDT today), so the symbol is
// passed in rather than assumed.

/** Whole kWh with thousands separators — "1,240 kWh". */
export const kwh = (v: number): string => `${Math.round(v).toLocaleString("en-US")} kWh`;

/** Whole currency units — "৳12,500". Unknown currencies render bare. */
export const money = (v: number, currency?: string): string =>
  `${currency === "BDT" ? "৳" : ""}${Math.round(v).toLocaleString("en-US")}`;
