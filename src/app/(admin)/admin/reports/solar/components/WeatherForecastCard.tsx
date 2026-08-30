import { Box, Card, CardContent, Typography } from "@mui/material";
import { Leaf } from "lucide-react";
import type { SolarWeather } from "@/types";
import WeatherDayCard from "./WeatherDayCard";
import WeatherNotice from "./WeatherNotice";

interface WeatherForecastCardProps {
  weather: SolarWeather | null;
  /** Set when the lookup failed, as opposed to no location being configured. */
  error: string | null;
}

/** Forward-looking forecast, at the foot of the page after the historical data. */
export default function WeatherForecastCard({ weather, error }: WeatherForecastCardProps) {
  const hasDays = !!weather?.available && weather.days.length > 0;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Leaf size={16} />
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            7-Day Forecast & Expected Generation
          </Typography>
        </Box>

        {hasDays ? (
          <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
            {weather!.days.map((d) => (
              <WeatherDayCard key={d.date} day={d} />
            ))}
          </Box>
        ) : error ? (
          <WeatherNotice
            severity="error"
            title="Weather forecast failed"
            actionLabel="Fix in Solar settings"
            body={
              <>
                <Typography variant="caption" color="text.secondary">
                  {error}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Check that latitude/longitude are valid decimal degrees (e.g. 23.8103, 90.4125 for
                  Dhaka).
                </Typography>
              </>
            }
          />
        ) : (
          <WeatherNotice
            title="Location not set"
            actionLabel="Open Solar settings"
            body={
              <Typography variant="caption" color="text.secondary">
                Set the plant&apos;s latitude and longitude in Solar settings to enable the 7-day
                forecast and expected generation. For Dhaka: 23.8103, 90.4125.
              </Typography>
            }
          />
        )}
      </CardContent>
    </Card>
  );
}
