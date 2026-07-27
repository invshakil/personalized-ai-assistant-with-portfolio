import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { TripParticipantRow, TripSplitMode } from "@/types";
import { fmtCurrency } from "../../format";

interface Props {
  participants: TripParticipantRow[]; // active only
  amount: number;
  currency: string;
  splitMode: TripSplitMode;
  selectedIds: string[];
  exactAmounts: Record<string, string>;
  onMode: (mode: TripSplitMode) => void;
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
  onSelectOnlyPayer: () => void;
  onExact: (id: string, val: string) => void;
}

export default function SplitEditor({
  participants,
  amount,
  currency,
  splitMode,
  selectedIds,
  exactAmounts,
  onMode,
  onToggle,
  onSelectAll,
  onSelectOnlyPayer,
  onExact,
}: Props) {
  const selected = new Set(selectedIds);
  const count = selectedIds.length;
  const equalPer = count > 0 ? amount / count : 0;
  const assigned = selectedIds.reduce((s, id) => s + (Number(exactAmounts[id]) || 0), 0);
  const remainder = Math.round((amount - assigned) * 100) / 100;

  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Split between
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={splitMode}
          onChange={(_, v) => v && onMode(v as TripSplitMode)}
        >
          <ToggleButton value="EQUAL">Equal</ToggleButton>
          <ToggleButton value="EXACT">Exact</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <Chip size="small" label="Everyone" variant="outlined" onClick={onSelectAll} />
        <Chip size="small" label="Only payer" variant="outlined" onClick={onSelectOnlyPayer} />
      </Box>

      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1 }}>
        {participants.map((p) => {
          const on = selected.has(p.id);
          return (
            <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FormControlLabel
                sx={{ flex: 1, m: 0 }}
                control={
                  <Checkbox
                    size="small"
                    checked={on}
                    onChange={(e) => onToggle(p.id, e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2">
                    {p.name}
                    {p.isSelf ? " (me)" : ""}
                  </Typography>
                }
              />
              {on && splitMode === "EXACT" ? (
                <TextField
                  type="number"
                  size="small"
                  value={exactAmounts[p.id] ?? ""}
                  onChange={(e) => onExact(p.id, e.target.value)}
                  sx={{ width: 110 }}
                />
              ) : (
                on && (
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", width: 110, textAlign: "right" }}
                  >
                    {fmtCurrency(equalPer, currency)}
                  </Typography>
                )
              )}
            </Box>
          );
        })}
      </Box>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 0.5,
          color:
            splitMode === "EXACT" && Math.abs(remainder) > 0.001 ? "error.main" : "text.secondary",
        }}
      >
        {count === 0
          ? "Select at least one person"
          : splitMode === "EQUAL"
            ? `${count} ${count === 1 ? "person" : "people"} · ${fmtCurrency(equalPer, currency)} each`
            : `Assigned ${fmtCurrency(assigned, currency)} of ${fmtCurrency(amount, currency)}` +
              (Math.abs(remainder) > 0.001 ? ` · ${fmtCurrency(remainder, currency)} left` : " ✓")}
      </Typography>
    </Box>
  );
}
