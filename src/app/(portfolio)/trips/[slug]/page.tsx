import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicTripSummary } from "@/services/trips";

// Serve this public page from the ISR cache, regenerating at most hourly. Keeps
// anonymous traffic off the DB and the third-party FX feed (one refresh per window,
// not one per visit) — see docs/TRIP_MANAGEMENT_AUDIT.md.
export const revalidate = 3600;

function fmtBdt(n: number): string {
  return `৳${Math.round(n).toLocaleString("en-IN")}`;
}

function fmtLocal(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trip = await getPublicTripSummary(slug);
  return {
    title: trip ? `${trip.name} — Trip cost guide` : "Trip",
    description: trip
      ? `What a trip to ${trip.destination} cost: ${fmtBdt(trip.totalBdt)} across ${trip.byCategory.length} categories.`
      : undefined,
  };
}

export default async function PublicTripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const trip = await getPublicTripSummary(slug);
  if (!trip) notFound();

  const perDay = trip.durationDays ? trip.totalBdt / trip.durationDays : null;
  const maxCat = Math.max(1, ...trip.byCategory.map((c) => c.bdt));

  return (
    <main className="min-h-screen bg-[var(--color-linen)] px-[var(--px)] py-16 text-[var(--color-forest)]">
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <p className="text-sm uppercase tracking-widest text-[var(--color-sage-dark)]">
          Trip cost guide
        </p>
        <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{trip.destination}</h1>
        <p className="mt-2 text-lg text-[var(--color-forest-light)]">{trip.name}</p>
        <p className="mt-1 text-sm text-[var(--color-sage-dark)]">
          {fmtDate(trip.startDate)}
          {trip.endDate ? ` – ${fmtDate(trip.endDate)}` : ""}
          {trip.durationDays ? ` · ${trip.durationDays} days` : ""}
        </p>

        {/* Totals */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/70 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-sage-dark)]">
              Total spent
            </p>
            <p className="mt-1 text-2xl font-bold">
              {fmtLocal(trip.totalLocal, trip.localCurrency)}
            </p>
            <p className="text-sm text-[var(--color-forest-light)]">{fmtBdt(trip.totalBdt)}</p>
          </div>
          {perDay != null && (
            <div className="rounded-2xl bg-white/70 p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-[var(--color-sage-dark)]">
                Per day
              </p>
              <p className="mt-1 text-2xl font-bold">{fmtBdt(perDay)}</p>
              <p className="text-sm text-[var(--color-forest-light)]">average</p>
            </div>
          )}
          <div className="rounded-2xl bg-white/70 p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[var(--color-sage-dark)]">
              Currency
            </p>
            <p className="mt-1 text-2xl font-bold">{trip.localCurrency}</p>
            <p className="text-sm text-[var(--color-forest-light)]">local currency</p>
          </div>
        </div>

        {/* Intro */}
        {trip.publicIntro && (
          <div className="mt-8 rounded-2xl bg-[var(--color-sage-light)] p-6">
            <p className="whitespace-pre-line text-[var(--color-forest)]">{trip.publicIntro}</p>
          </div>
        )}

        {/* Category breakdown */}
        {trip.byCategory.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold">Where the money went</h2>
            <div className="mt-4 space-y-3">
              {trip.byCategory.map((c) => (
                <div key={c.category}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{c.label}</span>
                    <span className="text-[var(--color-forest-light)]">
                      {fmtLocal(c.local, trip.localCurrency)} · {fmtBdt(c.bdt)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/60">
                    <div
                      className="h-full rounded-full bg-[var(--color-sage)]"
                      style={{ width: `${Math.max(3, (c.bdt / maxCat) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="mt-12 text-xs text-[var(--color-sage-dark)]">
          Costs are shown as a real-world guide from an actual trip. Your prices may vary with
          season, exchange rate and choices.
        </p>
      </div>
    </main>
  );
}
