// Minimal Google Calendar client — OAuth 2.0 + Calendar REST. Same approach as
// services/admin/googleDrive.ts: no `googleapis` dependency, plain fetch.
// Reuses the existing OAuth client (GOOGLE_OAUTH_CLIENT_ID/SECRET) — the user
// re-consents with Calendar scopes when connecting from the booking page.
//
// Redirect URI to register in Google Cloud:
//   <AUTH_URL>/api/admin/booking/google/callback

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
const CAL_BASE = "https://www.googleapis.com/calendar/v3";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events", // create / read / delete events
  "https://www.googleapis.com/auth/calendar.readonly", // freeBusy query
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

export function isCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function redirectUri(): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/admin/booking/google/callback`;
}

/** Consent URL. `state` is an anti-CSRF token verified on the callback. */
export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(
  code: string
): Promise<{ refreshToken: string; accessToken: string; email: string }> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${await res.text()}`);
  const data = (await res.json()) as TokenResponse;
  if (!data.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke the app at myaccount.google.com/permissions and reconnect."
    );
  }
  const email = await fetchEmail(data.access_token);
  return { refreshToken: data.refresh_token, accessToken: data.access_token, email };
}

export async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  return ((await res.json()) as TokenResponse).access_token;
}

async function fetchEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return "";
  return ((await res.json()) as { email?: string }).email ?? "";
}

export async function revokeToken(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Calendar operations ──────────────────────────────────────────────────────

export interface FreeBusyRange {
  start: string; // ISO
  end: string; // ISO
}

/** Query freeBusy for the given calendar between two ISO timestamps. */
export async function freeBusy(
  accessToken: string,
  calendarId: string,
  timeMin: string,
  timeMax: string
): Promise<FreeBusyRange[]> {
  const res = await fetch(`${CAL_BASE}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin,
      timeMax,
      items: [{ id: calendarId }],
    }),
  });
  if (!res.ok) throw new Error(`freeBusy failed: ${await res.text()}`);
  const data = (await res.json()) as {
    calendars?: Record<string, { busy?: FreeBusyRange[] }>;
  };
  return data.calendars?.[calendarId]?.busy ?? [];
}

export interface CreateEventInput {
  calendarId: string;
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  timezone: string;
  attendees: string[]; // email addresses
}

export interface CreatedEvent {
  id: string;
  htmlLink?: string;
  hangoutLink?: string;
  meetUrl: string | null;
}

/** Insert an event with conferenceData (Google Meet). sendUpdates=all → invites. */
export async function insertEvent(
  accessToken: string,
  input: CreateEventInput
): Promise<CreatedEvent> {
  const url = new URL(`${CAL_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events`);
  url.searchParams.set("conferenceDataVersion", "1");
  url.searchParams.set("sendUpdates", "all");
  const body = {
    summary: input.summary,
    description: input.description,
    start: { dateTime: input.startIso, timeZone: input.timezone },
    end: { dateTime: input.endIso, timeZone: input.timezone },
    attendees: input.attendees.map((email) => ({ email })),
    conferenceData: {
      createRequest: {
        requestId: `sshakil-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
    reminders: { useDefault: true },
  };
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Calendar insert failed: ${await res.text()}`);
  const data = (await res.json()) as {
    id: string;
    htmlLink?: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: { entryPointType: string; uri: string }[];
    };
  };
  const meet =
    data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
    data.hangoutLink ??
    null;
  return { id: data.id, htmlLink: data.htmlLink, hangoutLink: data.hangoutLink, meetUrl: meet };
}

/** Cancel an event. sendUpdates=all so the visitor sees the cancellation. */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const url = new URL(
    `${CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`
  );
  url.searchParams.set("sendUpdates", "all");
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 410 Gone or 404 means already cancelled — treat as success.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Calendar delete failed: ${await res.text()}`);
  }
}
