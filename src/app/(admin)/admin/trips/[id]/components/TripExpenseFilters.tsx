import { Box, Button, InputAdornment, TextField } from "@mui/material";
import { Search } from "@mui/icons-material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import { TRIP_CATEGORIES, TRIP_CATEGORY_LABEL } from "@/types";
import type { TripCategory, TripParticipantRow } from "@/types";

interface Props {
  category: TripCategory | "";
  payerId: string;
  q: string;
  participants: TripParticipantRow[];
  hasActiveFilters: boolean;
  matchCount: number;
  onCategoryChange: (v: string) => void;
  onPayerChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onClear: () => void;
}

export default function TripExpenseFilters({
  category,
  payerId,
  q,
  participants,
  hasActiveFilters,
  matchCount,
  onCategoryChange,
  onPayerChange,
  onSearchChange,
  onClear,
}: Props) {
  const categoryOptions = [
    { value: "", label: "All categories" },
    ...TRIP_CATEGORIES.map((c) => ({ value: c, label: TRIP_CATEGORY_LABEL[c] })),
  ];
  const payerOptions = [
    { value: "", label: "Anyone" },
    ...participants.map((p) => ({ value: p.id, label: p.isSelf ? `${p.name} (me)` : p.name })),
  ];

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 2 }}>
      <SearchableSelect
        label="Category"
        value={category}
        options={categoryOptions}
        onChange={onCategoryChange}
        sx={{ minWidth: 180 }}
      />
      <SearchableSelect
        label="Paid by"
        value={payerId}
        options={payerOptions}
        onChange={onPayerChange}
        sx={{ minWidth: 170 }}
      />
      <TextField
        size="small"
        placeholder="Search description…"
        value={q}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: 220, flex: "1 1 220px" }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
      {hasActiveFilters && (
        <>
          <Button size="small" onClick={onClear}>
            Clear
          </Button>
          <Box component="span" sx={{ fontSize: 12, color: "text.secondary" }}>
            {matchCount} {matchCount === 1 ? "match" : "matches"}
          </Box>
        </>
      )}
    </Box>
  );
}
