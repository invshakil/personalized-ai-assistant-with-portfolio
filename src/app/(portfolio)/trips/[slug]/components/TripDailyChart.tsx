import type { PublicTripSummary } from "@/types";
import { fmtBdt, fmtDayShort, fmtDayTick } from "../format";

/** Above this many days, per-bar ticks turn into noise — show only the endpoints. */
const DENSE_TICK_LIMIT = 21;

export default function TripDailyChart({ trip }: { trip: PublicTripSummary }) {
  const { byDay, insights } = trip;
  const peak = Math.max(1, ...byDay.map((d) => d.bdt));
  const showTicks = byDay.length <= DENSE_TICK_LIMIT;

  return (
    <>
      <h2 className="tr-h">Day by day</h2>
      <p className="tr-h-sub">
        What each day of the trip actually cost. Flat days are travel or rest days with nothing
        spent — the darker bar is the most expensive day.
      </p>

      <div className="tr-chart">
        {byDay.map((d) => {
          const isPeak = d.bdt > 0 && d.bdt === peak;
          const height = d.bdt > 0 ? `${Math.max(4, (d.bdt / peak) * 100)}%` : "3px";
          return (
            <div key={d.date} className="tr-col">
              <div
                className={`tr-col-fill${isPeak ? " is-peak" : ""}${d.bdt > 0 ? "" : " is-zero"}`}
                style={{ height }}
                title={`${fmtDayShort(d.date)} — ${d.bdt > 0 ? fmtBdt(d.bdt) : "no spending"}`}
              />
            </div>
          );
        })}
      </div>

      {showTicks ? (
        <div className="tr-chart-x">
          {byDay.map((d) => (
            <span key={d.date} className="tr-chart-lbl">
              {fmtDayTick(d.date)}
            </span>
          ))}
        </div>
      ) : (
        <div className="tr-chart-ends">
          <span>{fmtDayShort(byDay[0].date)}</span>
          <span>{fmtDayShort(byDay[byDay.length - 1].date)}</span>
        </div>
      )}

      {insights.busiestDay && (
        <p className="tr-h-sub" style={{ marginTop: 22, marginBottom: 0 }}>
          Peak day was {fmtDayShort(insights.busiestDay.date)} at {fmtBdt(insights.busiestDay.bdt)}{" "}
          — {Math.round((insights.busiestDay.bdt / trip.totalBdt) * 100)}% of the whole trip in a
          single day.
        </p>
      )}
    </>
  );
}
