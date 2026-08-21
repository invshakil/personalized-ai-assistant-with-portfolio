-- One-off cleanup: orphaned Earning rows from the 2026-08-20 failed-retry loop.
--
-- Cause: POST /api/admin/finance/earnings created the Earning row BEFORE posting
-- its linked ledger entry, with no transaction. A USD earning aimed at the EUR
-- "Wise" account failed at the link step, leaving the earning behind. The route
-- also had no try/catch, so the client saw a bare 500 and the user retried —
-- seven times, seven orphans.
--
-- Fixed in code: createEarning now wraps the earning + its linked entry in a
-- single db.$transaction, and the route returns { error } with a 400.
--
-- These 6 rows are duplicates of the 7th (cmt10afi206eq86n9vlikrgpv, kept):
-- all unrealized (realizedAt IS NULL), unlinked (transferEntryId IS NULL), and
-- with no matching MoneyEntry. They inflate pending USD income to $6,352.
--
-- Run against PRODUCTION. Take a backup first.

BEGIN;

-- Verify before deleting: expect exactly 6 rows, all t/t, none referenced.
SELECT id,
       date::date,
       "originalAmount",
       "fxRate",
       "realizedAt" IS NULL      AS unrealized,
       "transferEntryId" IS NULL AS unlinked
FROM "Earning"
WHERE id IN (
  'cmt108v6z06ee86n9j8gi9kqb',
  'cmt108yn906eg86n9rail467p',
  'cmt1093c106ei86n9j7polr8f',
  'cmt109pb206ek86n9uiw30pxi',
  'cmt10a1ik06em86n91tvsqwlk',
  'cmt10a2kh06eo86n91bhe2wyz'
);

DELETE FROM "Earning"
WHERE id IN (
  'cmt108v6z06ee86n9j8gi9kqb',
  'cmt108yn906eg86n9rail467p',
  'cmt1093c106ei86n9j7polr8f',
  'cmt109pb206ek86n9uiw30pxi',
  'cmt10a1ik06em86n91tvsqwlk',
  'cmt10a2kh06eo86n91bhe2wyz'
)
  AND "realizedAt" IS NULL        -- belt and braces: never touch realized income
  AND "transferEntryId" IS NULL;

-- Expect: USD -> 1 row, 907.50 (plus the unrelated EUR 52.74 row).
SELECT currency, count(*), sum("originalAmount")
FROM "Earning"
WHERE "realizedAt" IS NULL AND currency <> 'BDT'
GROUP BY currency;

COMMIT;
