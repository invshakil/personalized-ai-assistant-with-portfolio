// Every registered scope must actually be wired to a form, on both sides.
// No DB, no network — these run in `npm run test`.
//
// registry.ts carries this warning in a comment: "Adding a dropdown to this
// list is not enough on its own — the form's open-add path also has to call
// useFormDefaults. Keep the two in step; an entry here with no wiring shows the
// user a setting that does nothing." A comment cannot enforce that, and the
// gap it warns about is invisible in review: the Settings page renders a row
// for every registered field whether or not a form reads it.
//
// It is two-sided, which is how money.transfer slipped through. A form that
// seeds but never remembers still looks wired — right up until you switch that
// field to "Last used" in Settings and nothing ever follows your choice.
//
// So this scans the admin source for the call sites rather than trusting the
// registry to describe reality.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { DEFAULTABLE_FIELDS } from "../registry";

const ADMIN_ROOT = join(process.cwd(), "src/app/(admin)");

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/** scope → what the file declaring it does with the hook. */
const wiring = new Map<string, { seeds: boolean; remembers: boolean; file: string }>();

for (const file of sourceFiles(ADMIN_ROOT)) {
  const src = readFileSync(file, "utf8");
  const scopes = [...src.matchAll(/useFormDefaults\(\s*"([^"]+)"/g)].map((m) => m[1]);
  if (!scopes.length) continue;

  // The hook is destructured or held as `defaults`; either way the calls are
  // `.seed(` and `.remember(` on whatever it was bound to.
  const seeds = /\.seed\(/.test(src);
  const remembers = /\.remember\(/.test(src);
  for (const scope of scopes) {
    const prev = wiring.get(scope);
    wiring.set(scope, {
      seeds: seeds || !!prev?.seeds,
      remembers: remembers || !!prev?.remembers,
      file: prev?.file ?? file,
    });
  }
}

const registeredScopes = [...new Set(DEFAULTABLE_FIELDS.map((f) => f.scope))];

test("the registry lists at least one field", () => {
  // Guards the tests below from passing vacuously.
  assert.ok(registeredScopes.length > 0);
  assert.ok(wiring.size > 0, "found no useFormDefaults call sites — has the scan path moved?");
});

test("every registered scope is read by a form", () => {
  for (const scope of registeredScopes) {
    assert.ok(
      wiring.has(scope),
      `"${scope}" is registered but no form calls useFormDefaults("${scope}") — ` +
        `Settings would show a default that does nothing`
    );
  }
});

test("every registered scope seeds its form", () => {
  for (const scope of registeredScopes) {
    assert.ok(
      wiring.get(scope)?.seeds,
      `"${scope}" never calls .seed() — the default is never applied`
    );
  }
});

test("every registered scope reports what was saved", () => {
  // The regression: money.transfer seeded but never remembered, so the
  // "Last used" toggle the Settings page offers for its accounts was inert.
  for (const scope of registeredScopes) {
    assert.ok(
      wiring.get(scope)?.remembers,
      `"${scope}" never calls .remember() — its "Last used" mode can never take effect`
    );
  }
});

test("no form reads a scope the registry does not declare", () => {
  for (const [scope, { file }] of wiring) {
    assert.ok(
      registeredScopes.includes(scope),
      `${file.replace(process.cwd() + "/", "")} reads "${scope}", which is not in the registry — ` +
        `setFormDefault would refuse it`
    );
  }
});
