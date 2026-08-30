import { useEffect, useState } from "react";
import { solarApi } from "@/lib/api/solar";
import type { SolarOverview, SolarReport, SolarWeather } from "@/types";

/**
 * Loads everything the page renders.
 *
 * Overview (lifetime + payback) and weather are fetched once — neither depends
 * on the visible range. The report refetches whenever the bounds change, as a
 * real API request rather than a client-side slice of a larger payload.
 *
 * Weather failure is tracked separately from `error`: the forecast is a bonus
 * panel at the foot of the page, and losing it must not blank out the report.
 */
export function useSolarData(from?: string, to?: string) {
  const [report, setReport] = useState<SolarReport | null>(null);
  const [overview, setOverview] = useState<SolarOverview | null>(null);
  const [weather, setWeather] = useState<SolarWeather | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    solarApi
      .overview()
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load solar overview"));
    solarApi
      .weather()
      .then((w) => {
        setWeather(w);
        setWeatherError(null);
      })
      .catch((e) => {
        setWeather(null);
        setWeatherError(e instanceof Error ? e.message : "Failed to load weather");
      });
  }, []);

  // Depends on the primitive bounds, not the object holding them — an object
  // identity in the dependency list would refetch on every render.
  useEffect(() => {
    setLoading(true);
    setError(null);
    solarApi
      .report({ from, to })
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load solar reports"))
      .finally(() => setLoading(false));
  }, [from, to]);

  return { report, overview, weather, weatherError, loading, error };
}
