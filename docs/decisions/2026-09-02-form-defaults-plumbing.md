# Form defaults phase 1: plumbing

**The server decides whether a form default is fixed or last-used, and the registry is a hard gate on what can be stored** (Shakil, 2 Sep 2026).

- **Why the server decides:** putting the check on the client would mean a stale tab could overwrite a value the user had deliberately pinned.

This is entry D2 of the form defaults work stream.

| Piece                             | File                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------- |
| `FormDefault` model and migration | `prisma/schema.prisma`, `migrations/20260902000000_form_defaults/`              |
| Declared registry of fields       | `src/lib/formDefaults/registry.ts`                                              |
| Shared types                      | `src/types/formDefaults.ts` (and the barrel)                                    |
| Storage and mode enforcement      | `src/services/admin/formDefaults.ts`                                            |
| API                               | `/api/admin/form-defaults` (GET, PUT, DELETE), `/form-defaults/remember` (POST) |
| Client methods                    | `src/lib/api/admin.ts`                                                          |
| Load-once provider                | `src/components/admin/FormDefaultsProvider.tsx`, mounted in `AdminShell`        |
| Read hook with a staleness check  | `src/hooks/useFormDefaults.ts`                                                  |

Decisions taken during implementation:

- **The server decides the mode, not the client.** `rememberFormValues` looks up the effective mode (the stored row first, the registry second) and writes only `lastUsed` fields.
- **The registry is a hard gate.** `setFormDefault` throws for a scope or field that is not registered, so no hand-made request can invent one.
- **Rows for fields that have left the registry are filtered out on read.** The field no longer exists in any form, so a value for it would only confuse the Settings page.
- **Loading never blocks a form.** A failed fetch leaves the map empty, and every drawer opens exactly as it did before this feature existed.
- **`remember` is fire-and-forget.** The record is already saved. Failing to store a convenience default must never show as an error on a successful save.
- **Empty values are never remembered.** "Nothing chosen" is not a default worth keeping.

Verified against the live database, 11 checks: the registry guard refuses an unknown scope or field; a `fixed` default survives being used differently; `lastUsed` records and then moves with each save; a field switched to `fixed` stops following usage; an empty value does not overwrite a stored default; clearing removes the row; a stale id resolves to an empty field.
