// Typed client for the admin booking endpoints. Public booking endpoints
// (/api/booking/*) are called directly from the portfolio component via fetch
// because the Axios client baseURL is /api/admin.
import { apiDelete, apiGet, apiPost, apiPut } from "./client";
import type {
  BookingBlackout,
  BookingRecord,
  BookingSettings,
  BookingSettingsState,
  BookingStatus,
} from "@/types";

export interface BookingListFilters {
  status?: BookingStatus;
  window?: "upcoming" | "past" | "all";
  from?: string;
  to?: string;
  q?: string;
}

export const bookingApi = {
  getSettings: () => apiGet<BookingSettingsState>("/booking/settings"),
  updateSettings: (body: Partial<BookingSettings>) =>
    apiPut<BookingSettings>("/booking/settings", body),

  addBlackout: (date: string, reason: string | null) =>
    apiPost<BookingBlackout>("/booking/blackouts", { date, reason }),
  deleteBlackout: (id: string) => apiDelete(`/booking/blackouts/${id}`),

  disconnectGoogle: () => apiPost("/booking/google/disconnect"),

  list: (filters: BookingListFilters = {}) => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.window) qs.set("window", filters.window);
    if (filters.from) qs.set("from", filters.from);
    if (filters.to) qs.set("to", filters.to);
    if (filters.q) qs.set("q", filters.q);
    const tail = qs.toString();
    return apiGet<BookingRecord[]>(`/bookings${tail ? "?" + tail : ""}`);
  },
  cancel: (id: string, reason?: string) =>
    apiPost<BookingRecord>(`/bookings/${id}/cancel`, { reason }),
};
