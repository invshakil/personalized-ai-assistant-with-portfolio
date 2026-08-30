import Link from "next/link";
import { Button, Card, CardContent, Typography } from "@mui/material";
import { Sun } from "lucide-react";

interface SolarEmptyStateProps {
  /** True once SolisCloud credentials are set but nothing has synced yet. */
  configured: boolean;
}

/** Shown when there is no telemetry — either unconfigured, or configured but unsynced. */
export default function SolarEmptyState({ configured }: SolarEmptyStateProps) {
  return (
    <Card>
      <CardContent sx={{ p: 4, textAlign: "center" }}>
        <Sun size={36} color="#ff9f43" style={{ marginBottom: 12 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          No solar data yet
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 3, maxWidth: 460, mx: "auto" }}
        >
          {configured
            ? "Your SolisCloud credentials are set. Run a sync to pull your generation and energy data."
            : "Connect SolisCloud by setting SOLIS_KEY_ID / SOLIS_KEY_SECRET in .env.local, then sync."}
        </Typography>
        <Button component={Link} href="/admin/settings/solar" variant="contained">
          Go to Solar settings
        </Button>
      </CardContent>
    </Card>
  );
}
