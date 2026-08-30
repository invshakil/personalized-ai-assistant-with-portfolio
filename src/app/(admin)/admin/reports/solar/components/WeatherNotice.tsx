import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";

interface WeatherNoticeProps {
  title: string;
  body: React.ReactNode;
  actionLabel: string;
  /** Renders the notice in the error palette rather than the neutral one. */
  severity?: "info" | "error";
}

/**
 * The dashed-border stand-in shown instead of the forecast — either the lookup
 * failed or no location is set. Both end in the same place (Solar settings),
 * so they share one shell and differ only in wording and colour.
 */
export default function WeatherNotice({
  title,
  body,
  actionLabel,
  severity = "info",
}: WeatherNoticeProps) {
  const isError = severity === "error";
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: "1px dashed",
        borderColor: isError ? "error.main" : "divider",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      <Box>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, mb: 0.5, ...(isError && { color: "error.main" }) }}
        >
          {title}
        </Typography>
        {body}
      </Box>
      <Button
        component={Link}
        href="/admin/settings/solar"
        size="small"
        variant="outlined"
        {...(isError && { color: "error" as const })}
      >
        {actionLabel}
      </Button>
    </Box>
  );
}
