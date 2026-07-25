import Link from "next/link";
import { Box, Button, Chip, FormControlLabel, Switch, Typography } from "@mui/material";
import { Edit, OpenInNew } from "@mui/icons-material";
import { TRIP_STATUS_LABEL, type TripRow } from "@/types";
import { fmtDate, TRIP_STATUS_COLOR } from "../../format";

interface Props {
  trip: TripRow;
  publishBusy: boolean;
  onEdit: () => void;
  onTogglePublic: (makePublic: boolean) => void;
}

export default function TripDetailHeader({ trip, publishBusy, onEdit, onTogglePublic }: Props) {
  const publicUrl = trip.isPublic && trip.publicSlug ? `/trips/${trip.publicSlug}` : null;

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {trip.name}
            </Typography>
            <Chip
              size="small"
              label={TRIP_STATUS_LABEL[trip.status]}
              color={TRIP_STATUS_COLOR[trip.status]}
              variant="outlined"
            />
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {trip.destination} · {trip.localCurrency} · {fmtDate(trip.startDate)}
            {trip.endDate ? ` – ${fmtDate(trip.endDate)}` : ""}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<Edit />} onClick={onEdit}>
            Edit
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={trip.isPublic}
                disabled={publishBusy}
                onChange={(e) => onTogglePublic(e.target.checked)}
              />
            }
            label="Public"
          />
          {publicUrl && (
            <Button
              size="small"
              component={Link}
              href={publicUrl}
              target="_blank"
              endIcon={<OpenInNew />}
            >
              View
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
