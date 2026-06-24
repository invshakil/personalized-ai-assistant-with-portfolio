// 7-day weather forecast + predicted generation, via Open-Meteo (free, no API
// key). Uses the plant location from SolarSettings. Predicted generation is a
// simple PV model: peak-sun-hours × array kWp × performance ratio.
import type { SolarWeather, SolarWeatherDay } from "@/types";
import { getSolarSettings } from "./settings";

// Typical real-world DC→AC performance ratio (losses: inverter, heat, wiring).
const PERFORMANCE_RATIO = 0.78;
const DHAKA_TZ = "Asia/Dhaka";

// Condensed WMO weather-code descriptions.
const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

interface OpenMeteoDaily {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  cloud_cover_mean?: number[];
  shortwave_radiation_sum?: number[]; // MJ/m² per day
  precipitation_probability_max?: number[];
  weather_code?: number[];
}

function at(arr: number[] | undefined, i: number): number | null {
  const v = arr?.[i];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function getSolarWeather(): Promise<SolarWeather> {
  const settings = await getSolarSettings();
  const { latitude, longitude, systemSizeKwp } = settings;
  if (latitude == null || longitude == null) {
    return { available: false, latitude, longitude, days: [] };
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily:
      "temperature_2m_max,temperature_2m_min,cloud_cover_mean,shortwave_radiation_sum,precipitation_probability_max,weather_code",
    forecast_days: "7",
    timezone: DHAKA_TZ,
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Weather forecast unavailable (HTTP ${res.status}).`);
  const json = (await res.json()) as { daily?: OpenMeteoDaily };
  const d = json.daily ?? {};
  const times = d.time ?? [];

  const days: SolarWeatherDay[] = times.map((date, i) => {
    const radiationMj = at(d.shortwave_radiation_sum, i);
    const radiationKwhM2 = radiationMj != null ? radiationMj / 3.6 : null; // MJ → kWh
    const code = at(d.weather_code, i);
    // peak-sun-hours ≈ kWh/m² (irradiance normalized to 1 kW/m² STC)
    const predictedGenerationKwh =
      radiationKwhM2 != null && systemSizeKwp != null
        ? Math.round(radiationKwhM2 * systemSizeKwp * PERFORMANCE_RATIO * 10) / 10
        : null;
    return {
      date,
      tempMaxC: at(d.temperature_2m_max, i),
      tempMinC: at(d.temperature_2m_min, i),
      cloudCoverPct: at(d.cloud_cover_mean, i),
      radiationKwhM2: radiationKwhM2 != null ? Math.round(radiationKwhM2 * 100) / 100 : null,
      precipProbPct: at(d.precipitation_probability_max, i),
      weatherCode: code,
      description: code != null ? (WMO[code] ?? "Unknown") : "Unknown",
      predictedGenerationKwh,
    };
  });

  return { available: true, latitude, longitude, days };
}
