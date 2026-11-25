# Security audit of the embedded AI work

**The embedded AI branch was reviewed as a security analyst would, and no high or medium vulnerabilities were found** (Shakil, 30 Aug 2026).

This is entry A4 of the AI integration work stream.

Six candidates were examined and dismissed with reasons:

- Client-controlled category names.
- Prompt injection through CSV descriptions.
- `actionId` accepted without matching `tool` and `input`.
- `JSON.parse` of model output.
- Path traversal through `toMessageParams`.
- Error-message disclosure through `withApiError`.

The threat model: a single admin, every `/api/admin/*` route gated on `auth()`, and no role-based authorisation anywhere. A finding had to show impact reachable by an unauthenticated party.

One non-security note was raised and then fixed. See [Commit-time validation hardening](2026-08-30-commit-time-validation.md).
