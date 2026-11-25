# Ledger export to CSV and PDF (#17)

Signed in with the local admin login. Read-only.

1. **Filter:** on `/admin/money/entries`, pick a period and a category, and sort by amount.
2. **PDF:** choose Export, then PDF. You should get a PDF with the same rows in the same order, and income, expense and net totals per currency.
3. **CSV:** choose Export, then CSV. You should get the same rows.
4. **Signed out:** in a private window, open the export address from step 2. You should get an Unauthorized answer.

- **Must not happen:** rows in the file that the filter hides on screen; an export that works while signed out.
- **Records:** none are changed.
