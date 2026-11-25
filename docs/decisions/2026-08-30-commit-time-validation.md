# Commit-time validation hardening

**A value is validated on the server at every hop it crosses, so the CSV import re-checks AI category suggestions when it commits** (Shakil, 30 Aug 2026).

- **Why:** a guard applied where a value is produced does not protect the path where it is applied.

This is entry A5 of the AI integration work stream.

The gap: the preview guard constrained what the model could propose, but `commitImport` trusted `mapping.aiCategories` as sent, and that map comes back from the browser. Without a second pass, the guarantee held only while the client replayed it honestly. A hand-edited request could name a category that does not exist and have `ensureCategory` create it.

The fix: `validateSuggestionRecord` re-applies the category-exists and kind-matches rules on commit, against the live category list. The validators (`buildValidCategories`, `canonicalCategory`) are shared, so both passes decide the same way rather than drifting apart.

Verified: 6 new unit tests. Checked against the live database: the happy path is kept, a forged name is blocked, a kind mismatch is blocked (a real INCOME category refused on a DEBIT row), and the same category is still accepted on the correct direction.
