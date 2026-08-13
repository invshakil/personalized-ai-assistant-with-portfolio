// Turns the public summary into the display-ready insight cards. Pure derivation,
// kept out of the component so the component stays JSX-only (AGENTS.md).
import type { PublicTripSummary } from "@/types";
import { fmtBdt, fmtDayShort, fmtPct } from "./format";

export interface InsightCard {
  key: string;
  label: string;
  value: string;
  sub: string;
}

/** Costs locked in before departure vs. money spent once on the ground. */
const PRE_BOOKED = new Set(["FLIGHTS", "ACCOMMODATION", "VISA_INSURANCE"]);

/** "flights", "flights and stays", "flights, stays and paperwork" */
function listPhrase(parts: string[]): string {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

const PRE_BOOKED_NOUN: Record<string, string> = {
  FLIGHTS: "flights",
  ACCOMMODATION: "stays",
  VISA_INSURANCE: "paperwork",
};

export function buildInsightCards(trip: PublicTripSummary): InsightCard[] {
  const { insights: i, totalBdt } = trip;
  const cards: InsightCard[] = [];
  const pctOfTrip = (n: number) => (totalBdt > 0 ? fmtPct((n / totalBdt) * 100) : "—");

  if (i.avgPerActiveDayBdt != null) {
    cards.push({
      key: "typical",
      label: "A typical day",
      value: fmtBdt(i.avgPerActiveDayBdt),
      sub: `Averaged across the ${i.activeDays} days that actually carried spending${
        i.avgPerDayBdt != null ? `, versus ${fmtBdt(i.avgPerDayBdt)} across the full calendar` : ""
      }.`,
    });
  }

  if (i.busiestDay) {
    cards.push({
      key: "busiest",
      label: "Most expensive day",
      value: fmtDayShort(i.busiestDay.date),
      sub: `${fmtBdt(i.busiestDay.bdt)} in one day — ${pctOfTrip(i.busiestDay.bdt)} of the entire trip.`,
    });
  }

  if (i.quietestDay && i.busiestDay && i.quietestDay.date !== i.busiestDay.date) {
    cards.push({
      key: "quietest",
      label: "Leanest day",
      value: fmtBdt(i.quietestDay.bdt),
      sub: `The cheapest day with any spending at all (${fmtDayShort(i.quietestDay.date)}).`,
    });
  }

  if (i.topCategory) {
    cards.push({
      key: "top",
      label: "Biggest line item",
      value: i.topCategory.label,
      sub: `${fmtBdt(i.topCategory.bdt)}, or ${fmtPct(i.topCategory.share)} of everything spent.`,
    });
  }

  // Name only the pre-booked categories this trip actually has — a trip with no
  // flights should not be told its money went on flights.
  const bookedCats = trip.byCategory.filter((c) => PRE_BOOKED.has(c.category) && c.bdt > 0);
  const booked = bookedCats.reduce((sum, c) => sum + c.bdt, 0);
  if (booked > 0 && booked < totalBdt) {
    const nouns = listPhrase(bookedCats.map((c) => PRE_BOOKED_NOUN[c.category] ?? c.label));
    cards.push({
      key: "booked",
      label: "Booked before leaving",
      value: pctOfTrip(booked),
      sub: `${fmtBdt(booked)} went on ${nouns} — the rest (${fmtBdt(
        totalBdt - booked
      )}) was spent on the ground.`,
    });
  }

  if (i.totalPlannedBdt != null && i.totalPlannedBdt > 0) {
    const diff = totalBdt - i.totalPlannedBdt;
    const pct = fmtPct(Math.abs(diff / i.totalPlannedBdt) * 100);
    cards.push({
      key: "budget",
      label: "Against the budget",
      value: diff > 0 ? `${pct} over` : diff < 0 ? `${pct} under` : "On budget",
      sub: `Budgeted ${fmtBdt(i.totalPlannedBdt)}, spent ${fmtBdt(totalBdt)}${
        diff !== 0 ? ` — a ${fmtBdt(Math.abs(diff))} ${diff > 0 ? "overrun" : "saving"}` : ""
      }.`,
    });
  }

  return cards;
}
