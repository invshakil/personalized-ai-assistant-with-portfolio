import Link from "next/link";
import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Edit, Public } from "@mui/icons-material";
import { TRIP_STATUS_LABEL, type TripRow } from "@/types";
import { fmt, fmtDate, TRIP_STATUS_COLOR } from "../format";

interface Props {
  trips: TripRow[];
  loading: boolean;
  onEdit: (t: TripRow) => void;
}

export default function TripsTable({ trips, loading, onEdit }: Props) {
  if (loading) return <Typography sx={{ color: "text.secondary", py: 4 }}>Loading…</Typography>;
  if (!trips.length)
    return <Typography sx={{ color: "text.secondary", py: 4 }}>No trips yet.</Typography>;

  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Trip</TableCell>
            <TableCell>Dates</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Spent / Planned</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {trips.map((t) => (
            <TableRow key={t.id} hover>
              <TableCell>
                <Typography
                  component={Link}
                  href={`/admin/trips/${t.id}`}
                  sx={{
                    fontWeight: 600,
                    color: "text.primary",
                    textDecoration: "none",
                    "&:hover": { color: "primary.main", textDecoration: "underline" },
                  }}
                >
                  {t.name}
                </Typography>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  {t.destination}
                  {t.isPublic && (
                    <Public
                      sx={{ fontSize: 13, ml: 0.5, verticalAlign: "middle" }}
                      color="success"
                    />
                  )}
                </Typography>
              </TableCell>
              <TableCell sx={{ whiteSpace: "nowrap" }}>
                {fmtDate(t.startDate)}
                {t.endDate ? ` – ${fmtDate(t.endDate)}` : ""}
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={TRIP_STATUS_LABEL[t.status]}
                  color={TRIP_STATUS_COLOR[t.status]}
                  variant="outlined"
                />
              </TableCell>
              <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {fmt(t.totalActualBdt)}
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  of {fmt(t.totalPlannedBdt)}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Tooltip title="Edit trip">
                  <IconButton size="small" onClick={() => onEdit(t)}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}
