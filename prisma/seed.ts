import { PrismaClient, PaymentStatus, ExpenseCategory, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  // ─── Admin user ───────────────────────────────────────────────────────────
  const hash = await bcrypt.hash("isshakil32!", 12);
  await db.user.upsert({
    where: { email: "inverse.shakil@gmail.com" },
    update: { password: hash },
    create: {
      email: "inverse.shakil@gmail.com",
      name: "Shakil",
      password: hash,
      role: "ADMIN",
    },
  });
  console.log("✓ Admin user seeded");

  // ─── Add-on service catalog ───────────────────────────────────────────────
  for (const s of [
    { name: "WiFi",      description: "Monthly internet service" },
    { name: "Parking",   description: "Reserved parking space" },
    { name: "Generator", description: "Backup power / generator access" },
  ]) {
    await db.addOnService.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name, description: s.description, isActive: true },
    });
  }
  console.log("✓ Add-on services seeded (WiFi, Parking, Generator)");

  // ─── Units ─────────────────────────────────────────────────────────────────
  // monthlyRent is the current occupant's rent; vacant units carry a placeholder.
  const unitData = [
    { unitNumber: "Flat 1A", floor: "Ground Floor", monthlyRent: 7000 },   // vacant
    { unitNumber: "Flat 1B", floor: "Ground Floor", monthlyRent: 7000 },   // vacant
    { unitNumber: "Flat 2A", floor: "1st Floor",    monthlyRent: 9000 },   // T05 Alamin
    { unitNumber: "Flat 2B", floor: "1st Floor",    monthlyRent: 7000 },   // vacant
    { unitNumber: "Flat 2C", floor: "1st Floor",    monthlyRent: 8000 },   // T07 Ashraful
    { unitNumber: "Flat 2D", floor: "1st Floor",    monthlyRent: 8500 },   // T04 Foyez
    { unitNumber: "Flat 2E", floor: "1st Floor",    monthlyRent: 7000 },   // T06 Kamrul
    { unitNumber: "Flat 4A", floor: "3rd Floor",    monthlyRent: 7000 },   // vacant
    { unitNumber: "Flat 4B", floor: "3rd Floor",    monthlyRent: 7000 },   // vacant
    { unitNumber: "Flat 4C", floor: "3rd Floor",    monthlyRent: 7000 },   // vacant
    { unitNumber: "Flat 4D", floor: "3rd Floor",    monthlyRent: 9500 },   // T02 Faruk
    { unitNumber: "Flat 4E", floor: "3rd Floor",    monthlyRent: 7000 },   // T01 Sharif
    { unitNumber: "Flat 5A", floor: "4th Floor",    monthlyRent: 5000 },   // T03 Mintu
  ];

  for (const u of unitData) {
    await db.unit.upsert({
      where: { unitNumber: u.unitNumber },
      update: { floor: u.floor, monthlyRent: u.monthlyRent },
      create: { unitNumber: u.unitNumber, floor: u.floor, monthlyRent: u.monthlyRent, isOccupied: false },
    });
  }
  console.log("✓ 13 units seeded");

  const units = await db.unit.findMany();
  const unitMap = Object.fromEntries(units.map((u) => [u.unitNumber, u.id]));

  // ─── Former tenant: Nasrin (occupied Flat 2D before Foyez) ───────────────
  // She left around May 2026. No phone on record.
  const nasrin = await db.tenant.upsert({
    where: { tenantCode: "T00" },
    update: {
      name: "Nasrin",
      unitId: null,           // vacated
      isActive: false,
      advancePaid: false,
      advanceAmount: 0,
      notes: "Former tenant — vacated Flat 2D before June 2026",
    },
    create: {
      tenantCode: "T00",
      name: "Nasrin",
      unitId: null,
      moveInDate: new Date("2025-01-01"),  // approximate — not in Excel
      isActive: false,
      isExternal: false,
      advancePaid: false,
      advanceAmount: 0,
      notes: "Former tenant — vacated Flat 2D before June 2026",
    },
  });
  console.log("✓ Former tenant Nasrin (T00) seeded as inactive");

  // ─── Current tenants ──────────────────────────────────────────────────────
  // Source: Excel "Tenants" sheet. All dates converted from Excel serials.
  // 46082 = Mar 1 2026 | 45383 = Apr 1 2024 | 46113 = Apr 1 2026
  // 46174 = Jun 1 2026 | 46204 = Jul 1 2026
  // 46752 = Dec 31 2027 | 46568 = Jun 29 2027
  const tenantData = [
    {
      tenantCode: "T01",
      name: "Sharif",
      phone: "01322-231218",
      unitNumber: "Flat 4E",
      moveInDate: new Date("2026-03-01"),
      leaseEndDate: new Date("2027-12-31"),
      monthlyRent: 7000,
      advancePaid: true,
      advanceAmount: 7000,
      notes: null,
    },
    {
      tenantCode: "T02",
      name: "Faruk",
      phone: "01829-737266",
      unitNumber: "Flat 4D",
      moveInDate: new Date("2024-04-01"),
      leaseEndDate: new Date("2027-12-31"),
      monthlyRent: 9500,
      advancePaid: false,
      advanceAmount: 0,
      notes: null,
    },
    {
      tenantCode: "T03",
      name: "Mintu",
      phone: "01730-872119",
      unitNumber: "Flat 5A",
      moveInDate: new Date("2026-04-01"),
      leaseEndDate: new Date("2027-12-31"),
      monthlyRent: 5000,
      advancePaid: true,
      advanceAmount: 4500,
      notes: null,
    },
    {
      tenantCode: "T04",
      name: "Foyez",
      phone: "01731-301216",
      unitNumber: "Flat 2D",
      moveInDate: new Date("2026-06-01"),
      leaseEndDate: new Date("2027-06-29"),
      monthlyRent: 8500,
      advancePaid: true,
      advanceAmount: 6000,
      notes: null,
    },
    {
      tenantCode: "T05",
      name: "Alamin",
      phone: "01871001478",
      unitNumber: "Flat 2A",
      moveInDate: new Date("2026-07-01"),
      leaseEndDate: new Date("2027-06-29"),
      monthlyRent: 9000,
      advancePaid: true,
      advanceAmount: 9000,
      notes: "Rent increase ৳500 effective July 1, 2026",
    },
    {
      tenantCode: "T06",
      name: "Kamrul",
      phone: "01759363407",
      unitNumber: "Flat 2E",
      moveInDate: new Date("2026-06-01"),
      leaseEndDate: new Date("2027-06-29"),
      monthlyRent: 7000,
      advancePaid: true,
      advanceAmount: 7000,
      notes: null,
    },
    {
      tenantCode: "T07",
      name: "Ashraful",
      phone: "01810155335",
      unitNumber: "Flat 2C",
      moveInDate: new Date("2026-07-01"),
      leaseEndDate: new Date("2027-06-29"),
      monthlyRent: 8000,
      advancePaid: true,
      advanceAmount: 8000,
      notes: null,
    },
  ];

  // Clear existing unitId assignments to avoid unique constraint conflicts on re-seed
  await db.tenant.updateMany({ where: { tenantCode: { in: tenantData.map((t) => t.tenantCode) } }, data: { unitId: null } });
  await db.unit.updateMany({ data: { isOccupied: false } });

  for (const t of tenantData) {
    const unitId = unitMap[t.unitNumber];
    await db.tenant.upsert({
      where: { tenantCode: t.tenantCode },
      update: {
        name: t.name,
        phone: t.phone,
        unitId,
        moveInDate: t.moveInDate,
        leaseEndDate: t.leaseEndDate,
        advancePaid: t.advancePaid,
        advanceAmount: t.advanceAmount,
        notes: t.notes,
        isActive: true,
      },
      create: {
        tenantCode: t.tenantCode,
        name: t.name,
        phone: t.phone,
        unitId,
        moveInDate: t.moveInDate,
        leaseEndDate: t.leaseEndDate,
        advancePaid: t.advancePaid,
        advanceAmount: t.advanceAmount,
        notes: t.notes,
        isActive: true,
        isExternal: false,
      },
    });
    await db.unit.update({
      where: { id: unitId },
      data: { isOccupied: true, monthlyRent: t.monthlyRent },
    });
  }
  console.log("✓ 7 current tenants seeded (T01–T07)");

  // ─── Rent change for T05 (Alamin) ─────────────────────────────────────────
  const alamin = await db.tenant.findUnique({ where: { tenantCode: "T05" } });
  if (alamin) {
    const existing = await db.rentChange.findFirst({ where: { tenantId: alamin.id, appliedAt: null } });
    if (!existing) {
      await db.rentChange.create({
        data: {
          tenantId: alamin.id,
          effectiveDate: new Date("2026-07-01"),
          previousRent: 9000,
          newRent: 9500,
          reason: "Annual rent increase (per Excel notes)",
        },
      });
      console.log("✓ Rent change seeded for T05 Alamin (৳9,000 → ৳9,500 from Jul 1, 2026)");
    }
  }

  // ─── Historical payments ──────────────────────────────────────────────────
  // Source: Excel "Monthly Payments" sheet.
  // Month serial → billing month mapping (from dashboard cross-reference):
  //   45717/~  → March 2026   | 45748/45749/~ → April 2026  | 45783/45787/~ → May 2026
  //
  // Actual date-paid values (Excel serials, confirmed):
  //   46082 = Mar 1  | 46083 = Mar 2  | 46093 = Mar 12
  //   46122 = Apr 10 | 46124 = Apr 12
  //   46148 = May 6  | 46151 = May 9  | 46160 = May 18
  //
  // T01 Sharif  — 3 payments (Mar, Apr, May 2026) — moved in Mar 1 2026
  // T02 Faruk   — 2 payments (Apr, May 2026) — moved in Apr 2024, no Mar record in Excel
  // T03 Mintu   — 2 payments (Apr, May 2026) — moved in Apr 1 2026
  // T00 Nasrin  — 2 payments (Mar, Apr 2026) — former T04, vacated Flat 2D before Jun 2026
  //
  // Note: Nasrin's Mar payment shows amountPaid=7000 vs rentDue=8500 in Excel,
  // status="Paid" and balance=0 — kept as-is from source; user can correct.

  const flat2dId = unitMap["Flat 2D"];

  const paymentHistory: {
    tenantCode: string;
    unitNumber: string;
    month: number;
    year: number;
    rentDue: number;
    amountPaid: number;
    paidDate: Date;
    status: PaymentStatus;
  }[] = [
    // ── T01 Sharif ──
    { tenantCode: "T01", unitNumber: "Flat 4E", month: 3, year: 2026, rentDue: 7000, amountPaid: 7000, paidDate: new Date("2026-03-12"), status: PaymentStatus.PAID },
    { tenantCode: "T01", unitNumber: "Flat 4E", month: 4, year: 2026, rentDue: 7000, amountPaid: 7000, paidDate: new Date("2026-04-12"), status: PaymentStatus.PAID },
    { tenantCode: "T01", unitNumber: "Flat 4E", month: 5, year: 2026, rentDue: 7000, amountPaid: 7000, paidDate: new Date("2026-05-18"), status: PaymentStatus.PAID },
    // ── T02 Faruk ──
    { tenantCode: "T02", unitNumber: "Flat 4D", month: 4, year: 2026, rentDue: 9500, amountPaid: 9500, paidDate: new Date("2026-04-10"), status: PaymentStatus.PAID },
    { tenantCode: "T02", unitNumber: "Flat 4D", month: 5, year: 2026, rentDue: 9500, amountPaid: 9500, paidDate: new Date("2026-05-06"), status: PaymentStatus.PAID },
    // ── T03 Mintu ──
    { tenantCode: "T03", unitNumber: "Flat 5A", month: 4, year: 2026, rentDue: 5000, amountPaid: 5000, paidDate: new Date("2026-04-10"), status: PaymentStatus.PAID },
    { tenantCode: "T03", unitNumber: "Flat 5A", month: 5, year: 2026, rentDue: 5000, amountPaid: 5000, paidDate: new Date("2026-05-09"), status: PaymentStatus.PAID },
    // ── T00 Nasrin (former T04, Flat 2D) ──
    { tenantCode: "T00", unitNumber: "Flat 2D", month: 3, year: 2026, rentDue: 8500, amountPaid: 7000, paidDate: new Date("2026-03-01"), status: PaymentStatus.PAID },
    { tenantCode: "T00", unitNumber: "Flat 2D", month: 4, year: 2026, rentDue: 8500, amountPaid: 7000, paidDate: new Date("2026-03-02"), status: PaymentStatus.PAID },
  ];

  // Remove stale payments not present in Excel (e.g. old seed had T02/T03 for March 2026)
  for (const { tenantCode, month, year } of [
    { tenantCode: "T02", month: 3, year: 2026 },
    { tenantCode: "T03", month: 3, year: 2026 },
  ]) {
    const tenant = await db.tenant.findUnique({ where: { tenantCode } });
    if (tenant) {
      const stale = await db.payment.findFirst({ where: { tenantId: tenant.id, month, year } });
      if (stale) {
        await db.paymentTransaction.deleteMany({ where: { paymentId: stale.id } });
        await db.payment.delete({ where: { id: stale.id } });
      }
    }
  }

  let paymentCount = 0;
  for (const p of paymentHistory) {
    const tenant = await db.tenant.findUnique({ where: { tenantCode: p.tenantCode } });
    if (!tenant) continue;
    const unitId = p.tenantCode === "T00" ? flat2dId : unitMap[p.unitNumber];

    const payment = await db.payment.upsert({
      where: { tenantId_month_year: { tenantId: tenant.id, month: p.month, year: p.year } },
      update: { amountPaid: p.amountPaid, status: p.status, paidDate: p.paidDate, rentDue: p.rentDue },
      create: {
        tenantId: tenant.id,
        unitId,
        month: p.month,
        year: p.year,
        rentDue: p.rentDue,
        amountPaid: p.amountPaid,
        advanceApplied: 0,
        status: p.status,
        paidDate: p.paidDate,
      },
    });

    const txCount = await db.paymentTransaction.count({ where: { paymentId: payment.id } });
    if (txCount === 0) {
      await db.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          type: TransactionType.CASH,
          amount: p.amountPaid,
          date: p.paidDate,
          notes: "Migrated from Excel",
        },
      });
    }
    paymentCount++;
  }
  console.log(`✓ ${paymentCount} historical payment records seeded (Mar–May 2026)`);

  // ─── Property expenses (Mar–May 2026) ─────────────────────────────────────
  // Source: Excel "Expenses" sheet.
  // All payments are caretaker salary (Kaku), ৳13,000/mo, paid in cash.
  // Expense dates (Excel serials → converted):
  //   46082 = Mar 1, 2026  |  46124 = Apr 12, 2026  |  46152 = May 10, 2026
  const expenseHistory = [
    { expenseDate: new Date("2026-03-01"), month: 3, year: 2026 },
    { expenseDate: new Date("2026-04-12"), month: 4, year: 2026 },
    { expenseDate: new Date("2026-05-10"), month: 5, year: 2026 },
  ];

  for (const e of expenseHistory) {
    const existing = await db.expense.findFirst({
      where: { month: e.month, year: e.year, paidTo: "Kaku", category: ExpenseCategory.SALARY },
    });
    if (!existing) {
      await db.expense.create({
        data: {
          description: "Monthly caretaker salary",
          amount: 13000,
          currency: "BDT",
          category: ExpenseCategory.SALARY,
          month: e.month,
          year: e.year,
          expenseDate: e.expenseDate,
          paidTo: "Kaku",
          paymentMode: "Cash",
          notes: "Fixed monthly caretaker payment",
        },
      });
    }
  }
  console.log("✓ 3 expense records seeded (Mar–May 2026, ৳13,000/mo to Kaku)");

  console.log("\n✅ Seed complete.");
  console.log("   7 active tenants (T01–T07) | 1 inactive former tenant (T00 Nasrin)");
  console.log("   9 payment records | 3 expense records | 1 pending rent change (T05)");
  console.log("   Note: Nasrin (T00) Mar+Apr payments show amountPaid=৳7000 vs rentDue=৳8500");
  console.log("         — matches Excel source; correct via UI if needed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
