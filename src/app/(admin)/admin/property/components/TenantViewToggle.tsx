import { Box, Chip } from "@mui/material";

interface TenantViewToggleProps {
  view: "active" | "past";
  onChange: (v: "active" | "past") => void;
  pastLabel: string;
}

export default function TenantViewToggle({ view, onChange, pastLabel }: TenantViewToggleProps) {
  return (
    <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
      <Chip
        label="Active"
        clickable
        color={view === "active" ? "primary" : "default"}
        onClick={() => onChange("active")}
        sx={{ fontWeight: 600 }}
      />
      <Chip
        label={pastLabel}
        clickable
        color={view === "past" ? "primary" : "default"}
        onClick={() => onChange("past")}
        sx={{ fontWeight: 600 }}
      />
    </Box>
  );
}
