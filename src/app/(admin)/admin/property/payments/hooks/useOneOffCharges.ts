import { propertyApi } from "@/lib/api/property";
import type { OneOffCharge } from "@/types";
import { useBillLines, type BillLineApi } from "./useBillLines";

export type { BillLineTarget as ChargesTarget } from "./useBillLines";

// Module-level so the object identity is stable across renders — useBillLines
// keys its callbacks off it.
const chargesApi: BillLineApi<OneOffCharge> = {
  list: (params) => propertyApi.listOneOffCharges(params),
  create: (body) => propertyApi.createOneOffCharge(body),
  remove: (id) => propertyApi.deleteOneOffCharge(id),
  removeConfirm: "Remove this charge? It will be deducted from the month's bill.",
};

/** One-off charges (maintenance, repairs) added to a single month's bill. */
export function useOneOffCharges(onSuccess: () => Promise<void>) {
  return useBillLines(chargesApi, onSuccess);
}
