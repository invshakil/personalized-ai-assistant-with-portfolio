import { Box, Chip, Typography } from "@mui/material";
import type { SolarWeather } from "@/types";

interface WeatherDayCardProps {
  day: SolarWeather["days"][number];
}

/** One day in the 7-day forecast strip. */
export default function WeatherDayCard({ day: d }: WeatherDayCardProps) {
  return (
    <Box
      sx={{
        minWidth: 96,
        flexShrink: 0,
        p: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        textAlign: "center",
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {new Date(d.date).toLocaleDateString("en-US", { weekday: "short" })}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, my: 0.5 }}>
        {d.description}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {d.tempMaxC != null ? `${Math.round(d.tempMaxC)}°` : "—"} ·{" "}
        {d.cloudCoverPct != null ? `${Math.round(d.cloudCoverPct)}%☁` : ""}
      </Typography>
      {d.predictedGenerationKwh != null && (
        <Chip
          size="small"
          label={`~${d.predictedGenerationKwh} kWh`}
          sx={{ mt: 0.75, bgcolor: "rgba(255,159,67,0.15)", color: "warning.main" }}
        />
      )}
    </Box>
  );
}
