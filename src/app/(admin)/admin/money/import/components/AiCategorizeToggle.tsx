import { Box, Switch, Typography, FormControlLabel } from "@mui/material";
import { Sparkles } from "lucide-react";
import type { ImportMapping } from "@/lib/api/money";

interface AiCategorizeToggleProps {
  mapping: ImportMapping;
  onMappingChange: (updater: (m: ImportMapping) => ImportMapping) => void;
}

/**
 * Opt-in AI categorisation for rows a column doesn't already categorise.
 * Needs a description column — there is nothing to read without one.
 */
export default function AiCategorizeToggle({ mapping, onMappingChange }: AiCategorizeToggleProps) {
  const disabled = !mapping.description;

  return (
    <Box sx={{ mt: 1, mb: 2 }}>
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={!!mapping.aiCategorize && !disabled}
            disabled={disabled}
            onChange={(e) => onMappingChange((m) => ({ ...m, aiCategorize: e.target.checked }))}
          />
        }
        label={
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Sparkles size={15} />
            <Typography variant="body2">Suggest categories from descriptions</Typography>
          </Box>
        }
      />
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", pl: 0.5 }}>
        {disabled
          ? "Map a description column to enable this."
          : "Reads each description and picks from your existing categories. Suggestions are shown in the preview — nothing is saved until you import."}
      </Typography>
    </Box>
  );
}
