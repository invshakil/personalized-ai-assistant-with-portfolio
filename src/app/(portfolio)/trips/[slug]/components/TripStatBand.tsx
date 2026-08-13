import type { PublicTripSummary } from "@/types";
import { fmtBdt, fmtLocal } from "../format";

function Stat({ k, v, s }: { k: string; v: string; s?: string }) {
  return (
    <div className="tr-stat">
      <span className="tr-stat-k">{k}</span>
      <div className="tr-stat-v">{v}</div>
      {s && <p className="tr-stat-s">{s}</p>}
    </div>
  );
}

export default function TripStatBand({ trip }: { trip: PublicTripSummary }) {
  const { insights } = trip;
  // A trip spent in BDT has no meaningful "rate" tile — show the spread of
  // spending instead so the fourth slot always earns its place.
  const isForeign = trip.localCurrency !== "BDT" && insights.fxRate > 0;

  const days = trip.durationDays;
  const spanLabel = days ? `${days} ${days === 1 ? "day" : "days"}` : "Open-ended";

  return (
    <div className="tr-stats">
      <Stat
        k="Total spent"
        v={isForeign ? fmtLocal(trip.totalLocal, trip.localCurrency) : fmtBdt(trip.totalBdt)}
        s={isForeign ? fmtBdt(trip.totalBdt) : `${insights.expenseCount} expenses`}
      />
      <Stat
        k="Per day"
        v={insights.avgPerDayBdt != null ? fmtBdt(insights.avgPerDayBdt) : "—"}
        s={days ? `averaged over ${days} days` : "no end date set"}
      />
      <Stat
        k="Duration"
        v={spanLabel}
        s={`${insights.activeDays} with spending · ${insights.expenseCount} expenses`}
      />
      {isForeign ? (
        <Stat
          k="Rate paid"
          v={`৳${insights.fxRate.toFixed(2)}`}
          s={`average per 1 ${trip.localCurrency}`}
        />
      ) : (
        <Stat
          k="Categories"
          v={String(trip.byCategory.length)}
          s={
            insights.topCategory ? `led by ${insights.topCategory.label.toLowerCase()}` : undefined
          }
        />
      )}
    </div>
  );
}
