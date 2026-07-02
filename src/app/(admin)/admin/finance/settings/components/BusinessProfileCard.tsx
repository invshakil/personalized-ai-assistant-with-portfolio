import { Box, Card, CardContent, Typography, TextField, Button, Chip } from "@mui/material";
import type { BusinessProfile } from "../../types";

interface Props {
  business: BusinessProfile;
  onChange: (business: BusinessProfile) => void;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}

export default function BusinessProfileCard({ business, onChange, saving, saved, onSave }: Props) {
  const set = (field: keyof BusinessProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...business, [field]: e.target.value });

  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
            Business Profile
          </Typography>
          {saved && <Chip size="small" color="success" label="Saved" />}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Shown as the letterhead on every receipt, statement and report PDF.
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <TextField
            label="Company / name"
            size="small"
            value={business.name}
            onChange={set("name")}
          />
          <TextField
            label="Tagline"
            size="small"
            value={business.tagline}
            onChange={set("tagline")}
          />
          <TextField
            label="Address"
            size="small"
            value={business.address}
            onChange={set("address")}
          />
          <TextField label="Phone" size="small" value={business.phone} onChange={set("phone")} />
          <TextField label="Email" size="small" value={business.email} onChange={set("email")} />
        </Box>
        <Box sx={{ mt: 2 }}>
          <Button variant="contained" onClick={onSave} disabled={saving || !business.name.trim()}>
            {saving ? "Saving…" : "Save Business Profile"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
