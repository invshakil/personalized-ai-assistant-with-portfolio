/** Post-login redirect target; only same-origin /admin paths are accepted (no open redirects). */
export function safeCallbackPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/admin") || raw.startsWith("//") || raw.startsWith("/admin/login")) {
    return "/admin";
  }
  return raw;
}
