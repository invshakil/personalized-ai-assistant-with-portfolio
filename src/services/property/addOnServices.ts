import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";

export async function getServices() {
  const services = await db.addOnService.findMany({
    orderBy: { name: "asc" },
    include: {
      tenants: {
        where: { isActive: true },
        include: { tenant: { select: { id: true, tenantCode: true, name: true } } },
      },
    },
  });
  return services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    isActive: s.isActive,
    assignedCount: s.tenants.length,
    tenants: s.tenants.map((ts) => ({
      id: ts.id,
      tenantId: ts.tenantId,
      tenantCode: ts.tenant.tenantCode,
      tenantName: ts.tenant.name,
      monthlyFee: toNum(ts.monthlyFee),
      startDate: ts.startDate.toISOString(),
      endDate: toIso(ts.endDate),
    })),
  }));
}

export async function createService(name: string, description?: string | null) {
  return db.addOnService.create({
    data: { name, description: description ?? null, isActive: true },
  });
}

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export async function updateService(id: string, input: UpdateServiceInput) {
  return db.addOnService.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

export async function deactivateService(id: string) {
  return db.addOnService.update({ where: { id }, data: { isActive: false } });
}

export interface AssignServiceInput {
  tenantId: string;
  serviceId: string;
  monthlyFee: number;
  startDate: string;
  notes?: string | null;
}

export async function assignService(input: AssignServiceInput) {
  const { tenantId, serviceId, monthlyFee, startDate, notes } = input;

  // Re-activate and update fee if a previous subscription exists (ended)
  const existing = await db.tenantService.findUnique({
    where: { tenantId_serviceId: { tenantId, serviceId } },
  });

  const record = existing
    ? await db.tenantService.update({
        where: { tenantId_serviceId: { tenantId, serviceId } },
        data: { monthlyFee, startDate: new Date(startDate), endDate: null, isActive: true, notes: notes ?? null },
      })
    : await db.tenantService.create({
        data: { tenantId, serviceId, monthlyFee, startDate: new Date(startDate), isActive: true, notes: notes ?? null },
      });

  return { ...record, monthlyFee: toNum(record.monthlyFee), startDate: record.startDate.toISOString(), endDate: toIso(record.endDate) };
}

export interface UpdateAssignmentInput {
  monthlyFee?: number;
  endDate?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export async function updateServiceAssignment(id: string, input: UpdateAssignmentInput) {
  const record = await db.tenantService.update({
    where: { id },
    data: {
      ...(input.monthlyFee != null && { monthlyFee: input.monthlyFee }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate) : null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return { ...record, monthlyFee: toNum(record.monthlyFee), startDate: record.startDate.toISOString(), endDate: toIso(record.endDate) };
}

export async function endServiceAssignment(id: string) {
  const record = await db.tenantService.update({
    where: { id },
    data: { isActive: false, endDate: new Date() },
  });
  return { ...record, monthlyFee: toNum(record.monthlyFee), startDate: record.startDate.toISOString(), endDate: toIso(record.endDate) };
}
