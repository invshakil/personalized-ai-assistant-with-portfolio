// Backfill v1 trips into the v2 group-split model. For every existing trip:
//   1. ensure a single "Me" (isSelf) participant exists;
//   2. for each trip-tagged DEBIT MoneyEntry not yet backed by a TripExpense,
//      create a TripExpense (payer = self, single self-share, linked to the entry).
//
// Idempotent: skips trips that already have a self participant and entries that
// already have a linked TripExpense, so re-runs are safe. Existing card-paid
// entries keep their MoneyEntry link (we never retro-delete ledger rows); only
// NEW card expenses skip posting under v2.
//
// Usage: node_modules/.bin/tsx scripts/backfill-trip-groups.ts
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const db = new PrismaClient();
const money2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  const trips = await db.trip.findMany({ select: { id: true, name: true } });
  let participantsCreated = 0;
  let expensesCreated = 0;

  for (const trip of trips) {
    let self = await db.tripParticipant.findFirst({
      where: { tripId: trip.id, isSelf: true },
      select: { id: true },
    });
    if (!self) {
      self = await db.tripParticipant.create({
        data: { tripId: trip.id, name: "Me", isSelf: true },
        select: { id: true },
      });
      participantsCreated++;
    }

    const debits = await db.moneyEntry.findMany({
      where: { tripId: trip.id, direction: "DEBIT", tripExpense: null },
      select: {
        id: true,
        amount: true,
        currency: true,
        fxRate: true,
        date: true,
        tripCategory: true,
        accountId: true,
        description: true,
      },
    });

    for (const e of debits) {
      const amount = Number(e.amount);
      const fxRate = e.fxRate == null ? 1 : Number(e.fxRate);
      const amountBdt = money2(amount * fxRate);
      await db.tripExpense.create({
        data: {
          tripId: trip.id,
          description: e.description,
          category: e.tripCategory ?? "MISC",
          date: e.date,
          currency: e.currency,
          amount,
          fxRate,
          amountBdt,
          payerId: self.id,
          splitMode: "EQUAL",
          accountId: e.accountId,
          moneyEntryId: e.id,
          shares: { create: [{ participantId: self.id, amount, amountBdt }] },
        },
      });
      expensesCreated++;
    }
  }

  console.log(
    `Backfill complete: ${trips.length} trip(s), ${participantsCreated} self participant(s) created, ${expensesCreated} expense(s) backfilled.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
