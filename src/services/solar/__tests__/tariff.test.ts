// Pure unit tests for the cumulative slab billing math. No DB required.
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeBill, monthStartFromInput, type TariffRow } from "../tariff";

// BPDB residential — from June 2026 (the seeded defaults).
const JUNE_2026: TariffRow = {
  id: "t",
  name: "BPDB June 2026",
  distributor: "BPDB",
  effectiveFrom: "2026-06-01T00:00:00.000Z",
  demandCharge: 0,
  vatPercent: 5,
  note: null,
  slabs: [
    { id: "1", fromUnit: 0, toUnit: 50, rate: 5.32 },
    { id: "2", fromUnit: 51, toUnit: 75, rate: 5.72 },
    { id: "3", fromUnit: 76, toUnit: 200, rate: 8.5 },
    { id: "4", fromUnit: 201, toUnit: 300, rate: 9.1 },
    { id: "5", fromUnit: 301, toUnit: 400, rate: 9.62 },
    { id: "6", fromUnit: 401, toUnit: 600, rate: 15.01 },
    { id: "7", fromUnit: 601, toUnit: null, rate: 17.35 },
  ],
};

test("within the first slab", () => {
  const bill = computeBill(30, JUNE_2026);
  assert.equal(bill.energyCharge, 159.6); // 30 × 5.32
  assert.equal(bill.vat, 7.98);
  assert.equal(bill.total, 167.58);
});

test("spans three slabs (100 units)", () => {
  const bill = computeBill(100, JUNE_2026);
  // 50×5.32 + 25×5.72 + 25×8.50 = 266 + 143 + 212.5
  assert.equal(bill.energyCharge, 621.5);
  assert.equal(bill.total, 652.58); // + 5% VAT
});

test("crosses into the top unbounded slab (700 units)", () => {
  const bill = computeBill(700, JUNE_2026);
  assert.equal(bill.energyCharge, 8080.5);
});

test("zero usage costs nothing", () => {
  const bill = computeBill(0, JUNE_2026);
  assert.equal(bill.total, 0);
});

test("demand charge + VAT apply on top of energy", () => {
  const withDemand: TariffRow = { ...JUNE_2026, demandCharge: 100 };
  const bill = computeBill(30, withDemand);
  // energy 159.6 + demand 100 = 259.6; VAT 5% = 12.98; total 272.58
  assert.equal(bill.demandCharge, 100);
  assert.equal(bill.vat, 12.98);
  assert.equal(bill.total, 272.58);
});

test("monthStartFromInput parses by literal components (no TZ drift)", () => {
  const d = monthStartFromInput("2026-06");
  assert.equal(d.getUTCFullYear(), 2026);
  assert.equal(d.getUTCMonth(), 5); // June (0-based)
  assert.equal(d.getUTCDate(), 1);
});
