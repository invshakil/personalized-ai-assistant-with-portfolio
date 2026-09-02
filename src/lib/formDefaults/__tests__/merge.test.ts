// Merging the rows a "remember" write reports back into the client's map.
// No DB, no network — these run in `npm run test`.
//
// The server owns two decisions the client cannot reproduce: which fields are
// effectively in "lastUsed" mode, and whether a row already existed. So the
// response is authoritative, and the merge has to handle a row it has never
// seen — the case that used to be dropped, leaving the first save of every
// lastUsed field invisible until a page reload.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { FormDefaultRow } from "@/types";
import { mergeRememberedRows } from "../merge";

const row = (
  field: string,
  value: string,
  mode: "fixed" | "lastUsed" = "lastUsed"
): FormDefaultRow => ({
  scope: "money.entry",
  field,
  value,
  mode,
});

test("a row the client has never seen is added, not dropped", () => {
  // The regression: nothing stored yet, so the server CREATES the row. A merge
  // that only updates existing rows loses it.
  const merged = mergeRememberedRows([], [row("categoryId", "cement")]);
  assert.deepEqual(merged, [row("categoryId", "cement")]);
});

test("an existing row takes the newly written value", () => {
  const merged = mergeRememberedRows(
    [row("categoryId", "groceries")],
    [row("categoryId", "cement")]
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].value, "cement");
});

test("rows the server did not write are left untouched", () => {
  // accountId is pinned to "fixed", so the server ignores it even though the
  // form sent it. It must keep the pinned value, not the value just used.
  const prev = [row("accountId", "cash", "fixed"), row("categoryId", "groceries")];
  const merged = mergeRememberedRows(prev, [row("categoryId", "cement")]);

  assert.deepEqual(
    merged.find((r) => r.field === "accountId"),
    row("accountId", "cash", "fixed")
  );
  assert.equal(merged.find((r) => r.field === "categoryId")?.value, "cement");
});

test("an empty response changes nothing", () => {
  const prev = [row("accountId", "cash", "fixed")];
  assert.deepEqual(mergeRememberedRows(prev, []), prev);
});

test("rows from other scopes are not disturbed", () => {
  const other: FormDefaultRow = {
    scope: "money.transfer",
    field: "fromAccountId",
    value: "cash",
    mode: "fixed",
  };
  const merged = mergeRememberedRows([other], [row("categoryId", "cement")]);
  assert.equal(merged.length, 2);
  assert.deepEqual(merged[0], other);
});

test("the merge does not mutate the array it was given", () => {
  const prev = [row("categoryId", "groceries")];
  mergeRememberedRows(prev, [row("categoryId", "cement")]);
  assert.equal(prev[0].value, "groceries");
});
