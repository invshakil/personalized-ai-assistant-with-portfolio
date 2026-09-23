// Every numeric input in the admin must be the shared calculator <NumberField>.
// No DB, no network — `npm run test`.
//
// A native `type="number"` input quietly rejects "200 + 300", so one stray
// field breaks the "every number field is a calculator" promise without any
// visible error — it just refuses the keystroke. A review won't reliably catch
// that; this scan will.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src/app/(admin)", "src/app/admin", "src/components/admin"].map((r) =>
  join(process.cwd(), r)
);

function sourceFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.tsx$/.test(name)) out.push(path);
  }
  return out;
}

const files = ROOTS.flatMap((r) => sourceFiles(r));
const rel = (f: string) => relative(process.cwd(), f);

/** Source with line and JSX-block comments removed, so docs can name what they forbid. */
const code = (f: string) =>
  readFileSync(f, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

test("the scan found admin components to check", () => {
  // Guards the tests below from passing vacuously.
  assert.ok(files.length > 50);
});

test("no admin input uses a native number type", () => {
  const offenders = files.filter((f) => /type=(?:"number"|\{"number"\}|'number')/.test(code(f)));
  assert.deepEqual(offenders.map(rel), [], "use <NumberField> from @/components/admin/NumberField");
});

test("the retired AmountField is not reintroduced", () => {
  const offenders = files.filter((f) => /\bAmountField\b/.test(code(f)));
  assert.deepEqual(offenders.map(rel), [], "AmountField became NumberField");
});

test("NumberField is actually in use across the modules", () => {
  const users = files.filter((f) => /<NumberField\b/.test(code(f)));
  for (const mod of ["property", "finance", "money", "trips", "settings"]) {
    assert.ok(
      users.some((f) => f.includes(`/admin/${mod}/`)),
      `expected NumberField in the ${mod} module`
    );
  }
});
