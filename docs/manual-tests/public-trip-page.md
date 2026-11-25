# The public trip page shows totals only (#18)

Signed out. Read-only. Needs one published trip on the local database: publish a `zz-test-trip` from `/admin/trips` first if there is none.

1. **The page loads:** open `/trips/<slug>` for the published trip. You should see the destination, the dates, and totals by category and by day.
2. **Nothing private:** read the whole page, and view its source. You should find no participant names, no per-person amounts, and no account names.
3. **An unpublished trip:** open `/trips/<slug>` for a trip that isn't published. You should see the not-found page.

- **Must not happen:** a participant's name, what one person spent, or an account name anywhere on the page or in its source.
- **Records:** none are changed. Unpublish and delete `zz-test-trip` if you made it.
