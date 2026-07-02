export type ServiceEntry = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  assignedCount: number;
  tenants: {
    id: string;
    tenantId: string;
    tenantCode: string | null;
    tenantName: string;
    monthlyFee: number;
    startDate: string;
    endDate: string | null;
  }[];
};

export type TenantOption = { id: string; tenantCode: string | null; name: string };

export function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

export function serviceRevenue(s: ServiceEntry) {
  return s.tenants.reduce((sum, t) => sum + t.monthlyFee, 0);
}
