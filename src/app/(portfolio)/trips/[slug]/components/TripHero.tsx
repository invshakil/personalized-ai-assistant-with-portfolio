import type { PublicTripSummary } from "@/types";
import { fmtDate } from "../format";

export default function TripHero({ trip }: { trip: PublicTripSummary }) {
  const dates = trip.endDate
    ? `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`
    : fmtDate(trip.startDate);

  return (
    <>
      <div className="lbl">Trip cost guide</div>
      <h1 className="tr-title">{trip.destination}</h1>
      <p className="tr-name">{trip.name}</p>

      <div className="tr-meta">
        <span>{dates}</span>
        {trip.durationDays ? <span>{trip.durationDays} days</span> : null}
        <span>{trip.localCurrency}</span>
      </div>

      {trip.publicIntro && <p className="tr-intro">{trip.publicIntro}</p>}
    </>
  );
}
