// In-memory brute-force guard for the credentials login.
//
// Tracks failed attempts per identity key (normalised email) and locks the key
// after too many failures inside a rolling window. State lives in process
// memory — fine for the single-droplet deployment; it resets on restart and is
// not shared across instances. If this ever scales horizontally, back it with
// the database or a shared store instead.

const MAX_FAILURES = 5; // failures allowed within the window
const WINDOW_MS = 15 * 60_000; // rolling window the failures are counted in
const LOCKOUT_MS = 15 * 60_000; // how long the key stays locked once tripped

interface Attempt {
  failures: number;
  windowStart: number;
  lockedUntil: number;
}

const attempts = new Map<string, Attempt>();

const normalise = (email: string) => email.trim().toLowerCase();

/** Milliseconds remaining on an active lockout for this email, else 0. */
export function lockoutRemainingMs(email: string): number {
  const a = attempts.get(normalise(email));
  if (!a) return 0;
  const remaining = a.lockedUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** Record a failed login. Trips a lockout once failures hit the threshold. */
export function recordFailedLogin(email: string): void {
  const key = normalise(email);
  const now = Date.now();
  const a = attempts.get(key);

  // Fresh entry, or the previous window has elapsed → start counting over.
  if (!a || now - a.windowStart > WINDOW_MS) {
    attempts.set(key, { failures: 1, windowStart: now, lockedUntil: 0 });
    return;
  }

  a.failures += 1;
  if (a.failures >= MAX_FAILURES) {
    a.lockedUntil = now + LOCKOUT_MS;
    a.windowStart = now; // reset the window so the lock is a clean LOCKOUT_MS
    a.failures = 0;
  }
}

/** Clear all state for an email after a successful login. */
export function clearLoginAttempts(email: string): void {
  attempts.delete(normalise(email));
}
