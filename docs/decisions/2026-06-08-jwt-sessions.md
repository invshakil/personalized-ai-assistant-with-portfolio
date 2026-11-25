# JWT sessions, not database sessions

**The admin session is a JWT, not a database session** (Shakil, 8 Jun 2026).

- **Why:** it is simpler for a single-user setup, and no session table is needed.
- **Instead of:** database sessions.

The session later became a sliding 24-hour window: every admin page or API request re-issues the cookie. See [Sliding 24-hour admin session](2026-11-05-sliding-24-hour-admin-session.md).
