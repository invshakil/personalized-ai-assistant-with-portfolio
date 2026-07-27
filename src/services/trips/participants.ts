// Trip participants — the people on a group trip. Exactly one participant per trip
// is isSelf (the owner, "Me"), auto-created with the trip. Others are travel-mates,
// each optionally linked to a Beneficiary so their trip debt can tie back to the
// money-owed tracking. Participants with split history are soft-deleted (isActive)
// so the who-owes-whom math is never silently corrupted.
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { TripParticipantRow } from "@/types";

const PARTICIPANT_INCLUDE = {
  beneficiary: { select: { name: true } },
} satisfies Prisma.TripParticipantInclude;

type ParticipantWith = Prisma.TripParticipantGetPayload<{ include: typeof PARTICIPANT_INCLUDE }>;

function serialize(p: ParticipantWith): TripParticipantRow {
  return {
    id: p.id,
    tripId: p.tripId,
    name: p.name,
    isSelf: p.isSelf,
    beneficiaryId: p.beneficiaryId,
    beneficiaryName: p.beneficiary?.name ?? null,
    isActive: p.isActive,
    note: p.note,
  };
}

async function assertBeneficiary(beneficiaryId?: string | null): Promise<void> {
  if (!beneficiaryId) return;
  const b = await db.beneficiary.findUnique({ where: { id: beneficiaryId }, select: { id: true } });
  if (!b) throw new Error("Beneficiary not found");
}

export async function listParticipants(tripId: string): Promise<TripParticipantRow[]> {
  const rows = await db.tripParticipant.findMany({
    where: { tripId },
    include: PARTICIPANT_INCLUDE,
    orderBy: [{ isSelf: "desc" }, { name: "asc" }],
  });
  return rows.map(serialize);
}

export interface CreateParticipantInput {
  tripId: string;
  name: string;
  isSelf?: boolean;
  beneficiaryId?: string | null;
  note?: string | null;
}

export async function createParticipant(
  input: CreateParticipantInput
): Promise<TripParticipantRow> {
  if (!input.name?.trim()) throw new Error("name is required");
  await assertBeneficiary(input.beneficiaryId);
  const selfCount = await db.tripParticipant.count({
    where: { tripId: input.tripId, isSelf: true },
  });
  // First participant of a trip is always self; a self can't be added twice.
  const isSelf = selfCount === 0 ? true : Boolean(input.isSelf);
  if (isSelf && selfCount > 0) throw new Error("This trip already has a 'self' participant");
  const p = await db.tripParticipant.create({
    data: {
      tripId: input.tripId,
      name: input.name.trim(),
      isSelf,
      beneficiaryId: input.beneficiaryId || null,
      note: input.note ?? null,
    },
    include: PARTICIPANT_INCLUDE,
  });
  return serialize(p);
}

export interface UpdateParticipantInput {
  name?: string;
  beneficiaryId?: string | null;
  note?: string | null;
  isActive?: boolean;
}

export async function updateParticipant(
  tripId: string,
  id: string,
  input: UpdateParticipantInput
): Promise<TripParticipantRow> {
  const current = await db.tripParticipant.findUnique({ where: { id }, select: { tripId: true } });
  if (!current || current.tripId !== tripId) throw new Error("Participant not found for this trip");
  if (input.beneficiaryId !== undefined) await assertBeneficiary(input.beneficiaryId);
  if (input.name !== undefined && !input.name.trim()) throw new Error("name is required");
  const p = await db.tripParticipant.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.beneficiaryId !== undefined && { beneficiaryId: input.beneficiaryId || null }),
      ...(input.note !== undefined && { note: input.note }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    include: PARTICIPANT_INCLUDE,
  });
  return serialize(p);
}

/** Hard-delete a participant with no split history; soft-delete (isActive=false)
 *  one who has paid/shared/settled so the ledger math stays intact. Never self. */
export async function deleteParticipant(
  tripId: string,
  id: string
): Promise<{ deleted: boolean; softDeleted: boolean }> {
  const p = await db.tripParticipant.findUnique({
    where: { id },
    select: {
      tripId: true,
      isSelf: true,
      _count: {
        select: { paidExpenses: true, shares: true, settlementsFrom: true, settlementsTo: true },
      },
    },
  });
  if (!p || p.tripId !== tripId) throw new Error("Participant not found for this trip");
  if (p.isSelf) throw new Error("You cannot remove yourself from the trip");
  const hasActivity =
    p._count.paidExpenses + p._count.shares + p._count.settlementsFrom + p._count.settlementsTo > 0;
  if (hasActivity) {
    await db.tripParticipant.update({ where: { id }, data: { isActive: false } });
    return { deleted: true, softDeleted: true };
  }
  await db.tripParticipant.delete({ where: { id } });
  return { deleted: true, softDeleted: false };
}
