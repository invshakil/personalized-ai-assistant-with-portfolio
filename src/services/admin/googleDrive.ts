// Minimal Google Drive client over the OAuth 2.0 + Drive REST endpoints — no
// `googleapis` dependency. Used to upload database backups to the admin's own
// Google Drive. Scope is `drive.file` (least privilege: the app can only see
// and manage files it created).
//
// Required env (set once the OAuth client is created in Google Cloud):
//   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
// The redirect URI registered in Google must be:
//   <AUTH_URL>/api/admin/backup/google/callback

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
].join(" ");

const FOLDER_NAME = "sshakil DB backups";

export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function redirectUri(): string {
  const base = process.env.AUTH_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/admin/backup/google/callback`;
}

/** Google consent URL. `state` is an anti-CSRF token verified on callback. */
export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline", // get a refresh token
    prompt: "consent", // force refresh-token issuance every time
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

/** Exchange an auth code for tokens. Returns the refresh token + connected email. */
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
      "Google did not return a refresh token. Disconnect the app at myaccount.google.com/permissions and reconnect."
    );
  }
  const email = await fetchEmail(data.access_token);
  return { refreshToken: data.refresh_token, accessToken: data.access_token, email };
}

/** Trade a stored refresh token for a fresh access token. */
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

/** Optionally revoke the refresh token at Google (best-effort). */
export async function revokeToken(refreshToken: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
    });
  } catch {
    // best-effort; ignore
  }
}

/** Find-or-create the backups folder; returns its Drive file id. */
export async function ensureFolder(
  accessToken: string,
  existingId?: string | null
): Promise<string> {
  if (existingId) {
    const ok = await fetch(`${DRIVE_FILES}/${existingId}?fields=id,trashed`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ok.ok) {
      const f = (await ok.json()) as { trashed?: boolean };
      if (!f.trashed) return existingId;
    }
  }
  const res = await fetch(`${DRIVE_FILES}?fields=id`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!res.ok) throw new Error(`Drive folder create failed: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/** Multipart-upload a file into the folder; returns the new Drive file id. */
export async function uploadFile(
  accessToken: string,
  folderId: string,
  filename: string,
  data: Buffer,
  mimeType = "application/octet-stream"
): Promise<string> {
  const boundary = `sshakil${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    data,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch(`${DRIVE_UPLOAD}&fields=id`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Drive upload failed: ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/** Download a Drive file's bytes (alt=media). */
export async function downloadFile(accessToken: string, fileId: string): Promise<Buffer> {
  const res = await fetch(`${DRIVE_FILES}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Drive download failed: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

/** Delete a Drive file (best-effort; ignores 404). */
export async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  const res = await fetch(`${DRIVE_FILES}/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) throw new Error(`Drive delete failed: ${await res.text()}`);
}
