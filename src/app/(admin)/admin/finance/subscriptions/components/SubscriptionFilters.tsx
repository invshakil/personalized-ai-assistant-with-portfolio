import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Plus, Search, X } from "lucide-react";
import { type SelectOption } from "@/components/admin/SearchableSelect";
import MultiSearchableSelect from "@/components/admin/MultiSearchableSelect";
import { fmt } from "../../format";

interface SubscriptionFiltersProps {
  activeMonthly: number;
  categoryFilter: string[];
  categoryOptions: SelectOption[];
  onCategoryChange: (ids: string[]) => void;
  searchInput: string;
  onSearchChange: (v: string) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onAdd: () => void;
}

export default function SubscriptionFilters({
  activeMonthly,
  categoryFilter,
  categoryOptions,
  onCategoryChange,
  searchInput,
  onSearchChange,
  hasActiveFilters,
  onClearFilters,
  onAdd,
}: SubscriptionFiltersProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
      <Card sx={{ bgcolor: "background.paper", display: "inline-flex", px: 3, py: 1.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            Active monthly run-rate
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main" }}>
            {fmt(activeMonthly)}/mo
          </Typography>
        </Box>
      </Card>
      <MultiSearchableSelect
        label="Category"
        value={categoryFilter}
        options={categoryOptions}
        onChange={onCategoryChange}
        sx={{ minWidth: 180 }}
      />
      <TextField
        label="Search service"
        size="small"
        value={searchInput}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: 200 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
            endAdornment: searchInput ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => onSearchChange("")} edge="end">
                  <X size={14} />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />
      {hasActiveFilters && (
        <Button size="small" color="inherit" onClick={onClearFilters}>
          Clear
        </Button>
      )}
      <Box sx={{ ml: "auto" }}>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={onAdd}>
          Add Subscription
        </Button>
      </Box>
    </Box>
  );
}
