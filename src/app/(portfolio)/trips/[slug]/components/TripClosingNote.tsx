import Link from "next/link";
import type { PublicTripSummary } from "@/types";

export default function TripClosingNote({ trip }: { trip: PublicTripSummary }) {
  const isForeign = trip.localCurrency !== "BDT" && trip.insights.fxRate > 0;

  return (
    <>
      <p className="tr-note">
        These are real costs from an actual trip to {trip.destination}, not an estimate. Totals
        cover the whole group and are recorded in Bangladeshi taka
        {isForeign
          ? `, which worked out at an average of ৳${trip.insights.fxRate.toFixed(2)} per ${trip.localCurrency} across the trip`
          : ""}
        . Your own prices will move with the season, the exchange rate on the day, and how you like
        to travel.
      </p>
      <Link className="tr-note-link" href="/">
        More from Shakil
      </Link>
    </>
  );
}
