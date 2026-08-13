import { cache } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicTripSummary } from "@/services/trips";
import { fmtBdt } from "./format";
import { buildInsightCards } from "./insights";
import TripHero from "./components/TripHero";
import TripStatBand from "./components/TripStatBand";
import TripCategoryBreakdown from "./components/TripCategoryBreakdown";
import TripDailyChart from "./components/TripDailyChart";
import TripInsightCards from "./components/TripInsightCards";
import TripClosingNote from "./components/TripClosingNote";

// Serve this public page from the ISR cache, regenerating at most hourly. Keeps
// anonymous traffic off the DB and the third-party FX feed (one refresh per window,
// not one per visit) — see docs/TRIP_MANAGEMENT_AUDIT.md.
export const revalidate = 3600;

// generateMetadata and the page body both need the summary; cache() collapses them
// into a single DB + FX pass per render instead of two.
const getSummary = cache(getPublicTripSummary);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getSummary(slug);
  if (!trip) return { title: "Trip" };

  const days = trip.durationDays ? ` over ${trip.durationDays} days` : "";
  return {
    title: `${trip.destination} trip cost — ${fmtBdt(trip.totalBdt)} | Shakil`,
    description: `What a real trip to ${trip.destination} cost${days}: ${fmtBdt(
      trip.totalBdt
    )} across ${trip.byCategory.length} categories, with a day-by-day and per-category breakdown.`,
  };
}

export default async function PublicTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getSummary(slug);
  if (!trip) notFound();

  const cards = buildInsightCards(trip);
  const hasSpend = trip.totalBdt > 0 && trip.byCategory.length > 0;

  return (
    <>
      <section className="sec" id="trip-hero">
        <div className="sec-in">
          <TripHero trip={trip} />
          <TripStatBand trip={trip} />
        </div>
      </section>

      {hasSpend ? (
        <>
          <section className="sec" id="trip-breakdown">
            <div className="sec-in">
              <TripCategoryBreakdown trip={trip} />
            </div>
          </section>

          {trip.byDay.length > 1 && (
            <section className="sec" id="trip-daily">
              <div className="sec-in">
                <TripDailyChart trip={trip} />
              </div>
            </section>
          )}

          {cards.length > 0 && (
            <section className="sec" id="trip-insights">
              <div className="sec-in">
                <TripInsightCards cards={cards} />
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="sec" id="trip-breakdown">
          <div className="sec-in">
            <h2 className="tr-h">Costs coming soon</h2>
            <p className="tr-empty">
              This trip has been shared but no expenses have been recorded against it yet.
            </p>
          </div>
        </section>
      )}

      <section className="sec" id="trip-note">
        <div className="sec-in">
          <TripClosingNote trip={trip} />
        </div>
      </section>
    </>
  );
}
