# Review and audit reports live outside the repo (#19)

**Review and audit reports go to `../reviews/personalized-ai-assistant-portfolio/`, next to the repo and outside it. `docs/audits/` was moved there** (Shakil, 25 Nov 2026).

- **Why:** an audit report lists weaknesses, some before they are fixed, and the repo is public. Reports are also working notes, not documentation.
- `docs/TRIP_MANAGEMENT_AUDIT.md` stays for now: a comment in `src/app/(portfolio)/trips/[slug]/page.tsx` points to it, and this PR changes nothing under `src/`.
