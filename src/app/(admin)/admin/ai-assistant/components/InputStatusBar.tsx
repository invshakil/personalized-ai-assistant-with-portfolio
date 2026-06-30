import type { ProviderConfigView } from "@/services/ai/types";
import { Box, Chip, Typography } from "@mui/material";
import { Cpu, Mic } from "lucide-react";

interface InputStatusBarProps {
  scope: string;
  provider: ProviderConfigView | null;
  speechListening: boolean;
  speechError: string | null;
  hasTopBorder: boolean;
}

export default function InputStatusBar({
  scope,
  provider,
  speechListening,
  speechError,
  hasTopBorder,
}: InputStatusBarProps) {
  return (
    <Box
      sx={{
        px: 2,
        pt: 1.25,
        borderTop: hasTopBorder ? "1px solid" : "none",
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        flexWrap: "wrap",
      }}
    >
      {scope !== "all" && (
        <Chip
          label={`Scope: /${scope}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ height: 22, fontSize: "0.68rem" }}
        />
      )}
      {provider && (
        <Chip
          icon={<Cpu size={12} />}
          label={`${provider.label} · ${provider.defaultModel}`}
          size="small"
          variant="outlined"
          sx={{ height: 22, fontSize: "0.68rem", color: "text.secondary", borderColor: "divider" }}
        />
      )}
      {speechListening && (
        <Chip
          icon={<Mic size={12} />}
          label="Listening…"
          size="small"
          color="error"
          variant="outlined"
          sx={{ height: 22, fontSize: "0.68rem" }}
        />
      )}
      {speechError && (
        <Typography variant="caption" color="error.main" sx={{ ml: 0.5 }}>
          {speechError}
        </Typography>
      )}
    </Box>
  );
}
