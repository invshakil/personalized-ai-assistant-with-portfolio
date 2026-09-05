import { Box, Button, InputAdornment, TextField } from "@mui/material";
import { Plus, Search } from "lucide-react";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onAdd: () => void;
}

export default function CategoriesToolbar({ query, onQueryChange, onAdd }: Props) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
      <TextField
        placeholder="Search categories"
        size="small"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} />
              </InputAdornment>
            ),
          },
        }}
        sx={{ minWidth: 240 }}
      />
      <Button
        variant="contained"
        startIcon={<Plus size={16} />}
        onClick={onAdd}
        sx={{ ml: "auto" }}
      >
        Add Category
      </Button>
    </Box>
  );
}
