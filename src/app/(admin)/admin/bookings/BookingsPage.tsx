"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { ExternalLink, Search, X } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { bookingApi, type BookingListFilters } from "@/lib/api/booking";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { BookingRecord, BookingStatus } from "@/types";

const statusColor = (s: BookingStatus): "success" | "warning" | "default" =>
  s === "CONFIRMED" ? "success" : s === "PENDING" ? "warning" : "default";

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export default function BookingsPage() {
  const [rows, setRows] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<BookingListFilters>({ window: "upcoming" });
  const [pending, setPending] = useState<BookingRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bookingApi.list(filters);
      setRows(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const cancel = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await bookingApi.cancel(pending.id);
      setPending(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <PageHeader
        title="Bookings"
        subtitle="Consultations booked from the home page. Cancelling deletes the calendar event too."
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              select
              size="small"
              label="When"
              value={filters.window ?? "all"}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  window: e.target.value as BookingListFilters["window"],
                }))
              }
              sx={{ width: 140 }}
            >
              <MenuItem value="upcoming">Upcoming</MenuItem>
              <MenuItem value="past">Past</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              label="Status"
              value={filters.status ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  status: (e.target.value || undefined) as BookingStatus | undefined,
                }))
              }
              sx={{ width: 160 }}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CONFIRMED">Confirmed</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="From"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={filters.from?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  from: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                }))
              }
              sx={{ width: 160 }}
            />
            <TextField
              size="small"
              label="To"
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              value={filters.to?.slice(0, 10) ?? ""}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  to: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                }))
              }
              sx={{ width: 160 }}
            />
            <TextField
              size="small"
              label="Search name / email / topic"
              value={filters.q ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value || undefined }))}
              slotProps={{
                input: { startAdornment: <Search size={14} style={{ marginRight: 6 }} /> },
              }}
              sx={{ flex: 1, minWidth: 240 }}
            />
            <Button onClick={() => setFilters({ window: "upcoming" })} color="inherit">
              Reset
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" sx={mobileCardTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>When</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Visitor</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Topic</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ textAlign: "center", py: 4 }}>
                        <Typography color="text.secondary">
                          No bookings match these filters.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell data-label="When">
                          {formatWhen(r.startsAt)}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            {r.durationMin} min
                          </Typography>
                        </TableCell>
                        <TableCell data-label="Visitor">
                          <Typography variant="body2">{r.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {r.email}
                          </Typography>
                        </TableCell>
                        <TableCell data-label="Topic">
                          <Typography variant="body2">{r.topic}</Typography>
                          {r.message && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {r.message}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell data-label="Status">
                          <Chip
                            label={r.status}
                            size="small"
                            color={statusColor(r.status)}
                            variant="outlined"
                            sx={{ height: 20 }}
                          />
                        </TableCell>
                        <TableCell align="right" data-label="Actions">
                          {r.meetUrl && (
                            <Tooltip title="Open Meet">
                              <IconButton
                                size="small"
                                onClick={() => window.open(r.meetUrl!, "_blank")}
                              >
                                <ExternalLink size={14} />
                              </IconButton>
                            </Tooltip>
                          )}
                          {r.status !== "CANCELLED" && (
                            <Tooltip title="Cancel booking (deletes calendar event)">
                              <IconButton size="small" color="error" onClick={() => setPending(r)}>
                                <X size={14} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pending}
        title="Cancel booking"
        message={
          pending
            ? `Cancel ${pending.name}'s ${pending.durationMin}-minute booking on ${formatWhen(pending.startsAt)}? Google will email the cancellation.`
            : ""
        }
        confirmLabel="Cancel booking"
        loading={busy}
        onConfirm={cancel}
        onClose={() => setPending(null)}
      />
    </Box>
  );
}
