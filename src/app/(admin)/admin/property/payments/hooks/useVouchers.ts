import { propertyApi } from "@/lib/api/property";
import type { Voucher } from "@/types";
import { useBillLines, type BillLineApi } from "./useBillLines";

// Module-level so the object identity is stable across renders.
const vouchersApi: BillLineApi<Voucher> = {
  list: (params) => propertyApi.listVouchers(params),
  create: (body) => propertyApi.createVoucher(body),
  remove: (id) => propertyApi.deleteVoucher(id),
  removeConfirm: "Remove this voucher? The credit will be added back to the month's bill.",
};

/** Vouchers — credits applied against a single month's bill (discounts, or
 *  reimbursing a cost the tenant fronted that the landlord owes). */
export function useVouchers(onSuccess: () => Promise<void>) {
  return useBillLines(vouchersApi, onSuccess);
}
