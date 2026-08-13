import type { PublicTripSummary } from "@/types";
import { fmtBdt, fmtLocal, fmtPct } from "../format";

export default function TripCategoryBreakdown({ trip }: { trip: PublicTripSummary }) {
  const isForeign = trip.localCurrency !== "BDT";
  const hasPlan = trip.byCategory.some((c) => c.plannedBdt != null);
  // Scale every bar — and the planned marker — against the largest single value
  // on the chart, so an over-budget category still reads as over.
  const scale = Math.max(1, ...trip.byCategory.map((c) => Math.max(c.bdt, c.plannedBdt ?? 0)));

  return (
    <>
      <h2 className="tr-h">Where the money went</h2>
      <p className="tr-h-sub">
        Every shared cost on the trip, grouped by category and shown as a share of the total.
        {hasPlan ? " The tick on each bar marks what was budgeted for it." : ""}
      </p>

      <div className="tr-cats">
        {trip.byCategory.map((c) => (
          <div key={c.category}>
            <div className="tr-cat-top">
              <span className="tr-cat-name">
                {c.label}
                <em>{fmtPct(c.share)}</em>
              </span>
              <span className="tr-cat-amt">
                {isForeign ? fmtLocal(c.local, trip.localCurrency) : fmtBdt(c.bdt)}
                {isForeign && <small>{fmtBdt(c.bdt)}</small>}
              </span>
            </div>
            <div className="tr-bar">
              <div className="tr-bar-fill" style={{ width: `${(c.bdt / scale) * 100}%` }} />
              {c.plannedBdt != null && c.plannedBdt > 0 && (
                <div
                  className="tr-bar-plan"
                  style={{ left: `calc(${Math.min(100, (c.plannedBdt / scale) * 100)}% - 1px)` }}
                  title={`Budgeted ${fmtBdt(c.plannedBdt)}`}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {hasPlan && (
        <div className="tr-legend">
          <span className="tr-legend-i">
            <i />
            Actual spend
          </span>
          <span className="tr-legend-i is-plan">
            <i />
            Budgeted
          </span>
        </div>
      )}
    </>
  );
}
