import { ExpenseCategory, PaymentStatus, PrismaClient, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedFinancial } from "./seed-financial";

const db = new PrismaClient();

async function main() {
  // ─── Admin user (always runs — keeps credentials in sync on every deploy) ──
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment.");
  }
  const hash = await bcrypt.hash(adminPassword, 12);
  await db.user.upsert({
    where: { email: adminEmail },
    update: { password: hash },
    create: { email: adminEmail, name: "Shakil", password: hash, role: "ADMIN" },
  });
  console.log("✓ Admin user seeded");

  // ─── Financial Tracker (own guard; runs before the property early-return) ──
  await seedFinancial(db);

  // ─── Property Service Types (idempotent — always runs) ───────────────────
  const serviceTypes: { name: string; category: ExpenseCategory; description?: string }[] = [
    { name: "Electricity Bill", category: ExpenseCategory.UTILITY, description: "Monthly electricity" },
    { name: "Water Bill", category: ExpenseCategory.UTILITY, description: "Monthly water supply" },
    { name: "Gas Bill", category: ExpenseCategory.UTILITY, description: "Monthly gas supply" },
    { name: "Internet / WiFi", category: ExpenseCategory.SUBSCRIPTION, description: "Internet service" },
    { name: "Plumbing", category: ExpenseCategory.MAINTENANCE, description: "Plumbing repairs" },
    { name: "General Maintenance", category: ExpenseCategory.MAINTENANCE, description: "Miscellaneous repairs" },
    { name: "Caretaker Salary", category: ExpenseCategory.SALARY, description: "Monthly caretaker pay" },
    { name: "Security Salary", category: ExpenseCategory.SALARY, description: "Monthly security guard pay" },
    { name: "Cleaning", category: ExpenseCategory.SALARY, description: "Cleaning services" },
  ];
  for (const st of serviceTypes) {
    await db.propertyServiceType.upsert({
      where: { name: st.name },
      update: { category: st.category, description: st.description ?? null },
      create: { name: st.name, category: st.category, description: st.description ?? null },
    });
  }
  console.log(`✓ Property service types seeded (${serviceTypes.length})`);

  // ─── Already-seeded guard ─────────────────────────────────────────────────
  // Property data is seeded once. If units already exist we skip the entire
  // section — prevents re-running expensive upserts and temporarily clearing
  // unit assignments on every deploy.
  const unitCount = await db.unit.count();
  if (unitCount >= 13) {
    console.log("ℹ Property data already seeded — skipping.");
    console.log("\n✅ Seed complete (admin user updated; property data unchanged).");
    return;
  }

  // ─── Property data (runs inside a transaction — rolls back on any error) ──
  console.log("→ Seeding property data for the first time...");

  await db.$transaction(
    async (tx) => {
      // ── Add-on service catalog ─────────────────────────────────────────────
      for (const s of [
        { name: "WiFi", description: "Monthly internet service" },
        { name: "Parking", description: "Reserved parking space" },
        { name: "Generator", description: "Backup power / generator access" },
      ]) {
        await tx.addOnService.upsert({
          where: { name: s.name },
          update: {},
          create: { name: s.name, description: s.description, isActive: true },
        });
      }
      console.log("  ✓ Add-on services seeded (WiFi, Parking, Generator)");

      // ── Units ──────────────────────────────────────────────────────────────
      const unitData = [
        { unitNumber: "Flat 1A", floor: "Ground Floor", monthlyRent: 10000 },
        { unitNumber: "Flat 1B", floor: "Ground Floor", monthlyRent: 10000 },
        { unitNumber: "Flat 2A", floor: "1st Floor", monthlyRent: 9000 },
        { unitNumber: "Flat 2B", floor: "1st Floor", monthlyRent: 9000 },
        { unitNumber: "Flat 2C", floor: "1st Floor", monthlyRent: 8000 },
        { unitNumber: "Flat 2D", floor: "1st Floor", monthlyRent: 8500 },
        { unitNumber: "Flat 2E", floor: "1st Floor", monthlyRent: 7000 },
        { unitNumber: "Flat 4A", floor: "3rd Floor", monthlyRent: 9000 },
        { unitNumber: "Flat 4B", floor: "3rd Floor", monthlyRent: 8500 },
        { unitNumber: "Flat 4C", floor: "3rd Floor", monthlyRent: 7000 },
        { unitNumber: "Flat 4D", floor: "3rd Floor", monthlyRent: 9000 },
        { unitNumber: "Flat 4E", floor: "3rd Floor", monthlyRent: 7000 },
        { unitNumber: "Flat 5A", floor: "4th Floor", monthlyRent: 4500 },
      ];

      for (const u of unitData) {
        await tx.unit.upsert({
          where: { unitNumber: u.unitNumber },
          update: { floor: u.floor, monthlyRent: u.monthlyRent },
          create: {
            unitNumber: u.unitNumber,
            floor: u.floor,
            monthlyRent: u.monthlyRent,
            isOccupied: false,
          },
        });
      }
      console.log("  ✓ 13 units seeded");

      const units = await tx.unit.findMany();
      const unitMap = Object.fromEntries(units.map((u) => [u.unitNumber, u.id]));

      // ── Former tenant: Mary Wilson ──────────────────────────────────────────────
      await tx.tenant.upsert({
        where: { tenantCode: "T00" },
        update: {
          name: "Mary Wilson",
          unitId: null,
          isActive: false,
          advancePaid: false,
          advanceAmount: 0,
          notes: "Former tenant — vacated Flat 2D before June 2026",
        },
        create: {
          tenantCode: "T00",
          name: "Mary Wilson",
          unitId: null,
          moveInDate: new Date("2025-01-01"),
          isActive: false,
          isExternal: false,
          advancePaid: false,
          advanceAmount: 0,
          notes: "Former tenant — vacated Flat 2D before June 2026",
        },
      });
      console.log("  ✓ Former tenant Mary Wilson (T00) seeded as inactive");

      // ── Current tenants ────────────────────────────────────────────────────
      const tenantData = [
        {
          tenantCode: "T01",
          name: "James Brown",
          phone: "01700-000001",
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
          name: "William Jones",
          phone: "01700-000002",
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
          name: "Richard Miller",
          phone: "01700-000003",
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
          name: "Thomas Moore",
          phone: "01700-000004",
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
          name: "Charles Taylor",
          phone: "01700000005",
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
          name: "Daniel Anderson",
          phone: "01700000006",
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
          name: "Matthew Thomas",
          phone: "01700000007",
          unitNumber: "Flat 2C",
          moveInDate: new Date("2026-07-01"),
          leaseEndDate: new Date("2027-06-29"),
          monthlyRent: 8000,
          advancePaid: true,
          advanceAmount: 8000,
          notes: null,
        },
      ];

      // Clear unit assignments first to avoid unique constraint conflicts
      await tx.tenant.updateMany({
        where: { tenantCode: { in: tenantData.map((t) => t.tenantCode) } },
        data: { unitId: null },
      });
      await tx.unit.updateMany({ data: { isOccupied: false } });

      for (const t of tenantData) {
        const unitId = unitMap[t.unitNumber];
        await tx.tenant.upsert({
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
        await tx.unit.update({
          where: { id: unitId },
          data: { isOccupied: true, monthlyRent: t.monthlyRent },
        });
      }
      console.log("  ✓ 7 current tenants seeded (T01–T07)");

      // ── Rent change for T05 (Charles Taylor) ───────────────────────────────────────
      const alamin = await tx.tenant.findUnique({ where: { tenantCode: "T05" } });
      if (alamin) {
        const existing = await tx.rentChange.findFirst({
          where: { tenantId: alamin.id, appliedAt: null },
        });
        if (!existing) {
          await tx.rentChange.create({
            data: {
              tenantId: alamin.id,
              effectiveDate: new Date("2026-07-01"),
              previousRent: 9000,
              newRent: 9500,
              reason: "Annual rent increase (per Excel notes)",
            },
          });
          console.log("  ✓ Rent change seeded for T05 Charles Taylor (৳9,000 → ৳9,500 from Jul 1, 2026)");
        }
      }

      // ── Historical payments ────────────────────────────────────────────────
      const flat2dId = unitMap["Flat 2D"];

      type PaymentEntry = {
        tenantCode: string;
        unitNumber: string;
        month: number;
        year: number;
        rentDue: number;
        amountPaid: number;
        paidDate: Date;
        status: PaymentStatus;
      };
      const paymentHistory: PaymentEntry[] = [
        {
          tenantCode: "T01",
          unitNumber: "Flat 4E",
          month: 3,
          year: 2026,
          rentDue: 7000,
          amountPaid: 7000,
          paidDate: new Date("2026-03-12"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T01",
          unitNumber: "Flat 4E",
          month: 4,
          year: 2026,
          rentDue: 7000,
          amountPaid: 7000,
          paidDate: new Date("2026-04-12"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T01",
          unitNumber: "Flat 4E",
          month: 5,
          year: 2026,
          rentDue: 7000,
          amountPaid: 7000,
          paidDate: new Date("2026-05-18"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T02",
          unitNumber: "Flat 4D",
          month: 4,
          year: 2026,
          rentDue: 9500,
          amountPaid: 9500,
          paidDate: new Date("2026-04-10"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T02",
          unitNumber: "Flat 4D",
          month: 5,
          year: 2026,
          rentDue: 9500,
          amountPaid: 9500,
          paidDate: new Date("2026-05-06"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T03",
          unitNumber: "Flat 5A",
          month: 4,
          year: 2026,
          rentDue: 5000,
          amountPaid: 5000,
          paidDate: new Date("2026-04-10"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T03",
          unitNumber: "Flat 5A",
          month: 5,
          year: 2026,
          rentDue: 5000,
          amountPaid: 5000,
          paidDate: new Date("2026-05-09"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T00",
          unitNumber: "Flat 2D",
          month: 3,
          year: 2026,
          rentDue: 8500,
          amountPaid: 7000,
          paidDate: new Date("2026-03-01"),
          status: PaymentStatus.PAID,
        },
        {
          tenantCode: "T00",
          unitNumber: "Flat 2D",
          month: 4,
          year: 2026,
          rentDue: 8500,
          amountPaid: 7000,
          paidDate: new Date("2026-03-02"),
          status: PaymentStatus.PAID,
        },
      ];

      // Remove stale payments not present in the Excel source
      for (const { tenantCode, month, year } of [
        { tenantCode: "T02", month: 3, year: 2026 },
        { tenantCode: "T03", month: 3, year: 2026 },
      ]) {
        const tenant = await tx.tenant.findUnique({ where: { tenantCode } });
        if (tenant) {
          const stale = await tx.payment.findFirst({ where: { tenantId: tenant.id, month, year } });
          if (stale) {
            await tx.paymentTransaction.deleteMany({ where: { paymentId: stale.id } });
            await tx.payment.delete({ where: { id: stale.id } });
          }
        }
      }

      let paymentCount = 0;
      for (const p of paymentHistory) {
        const tenant = await tx.tenant.findUnique({ where: { tenantCode: p.tenantCode } });
        if (!tenant) continue;
        const unitId = p.tenantCode === "T00" ? flat2dId : unitMap[p.unitNumber];
        const payment = await tx.payment.upsert({
          where: { tenantId_month_year: { tenantId: tenant.id, month: p.month, year: p.year } },
          update: {
            amountPaid: p.amountPaid,
            status: p.status,
            paidDate: p.paidDate,
            rentDue: p.rentDue,
          },
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
        const txCount = await tx.paymentTransaction.count({ where: { paymentId: payment.id } });
        if (txCount === 0) {
          await tx.paymentTransaction.create({
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
      console.log(`  ✓ ${paymentCount} historical payment records seeded (Mar–May 2026)`);

      // ── Property expenses ──────────────────────────────────────────────────
      const expenseHistory = [
        { expenseDate: new Date("2026-03-01"), month: 3, year: 2026 },
        { expenseDate: new Date("2026-04-12"), month: 4, year: 2026 },
        { expenseDate: new Date("2026-05-10"), month: 5, year: 2026 },
      ];

      for (const e of expenseHistory) {
        const existing = await tx.expense.findFirst({
          where: { month: e.month, year: e.year, paidTo: "Mr. Walker", category: ExpenseCategory.SALARY },
        });
        if (!existing) {
          await tx.expense.create({
            data: {
              description: "Monthly caretaker salary",
              amount: 13000,
              currency: "BDT",
              category: ExpenseCategory.SALARY,
              month: e.month,
              year: e.year,
              expenseDate: e.expenseDate,
              paidTo: "Mr. Walker",
              paymentMode: "Cash",
              notes: "Fixed monthly caretaker payment",
            },
          });
        }
      }
      console.log("  ✓ 3 expense records seeded (Mar–May 2026, ৳13,000/mo to Mr. Walker)");
    },
    { timeout: 120_000 } // 2-minute timeout for the full property seed
  );

  console.log("\n✅ Seed complete.");
  console.log("   7 active tenants (T01–T07) | 1 inactive former tenant (T00 Mary Wilson)");
  console.log("   9 payment records | 3 expense records | 1 pending rent change (T05)");
  console.log("   Note: Mary Wilson (T00) Mar+Apr payments show amountPaid=৳7,000 vs rentDue=৳8,500");
  console.log("         — matches Excel source; correct via UI if needed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
