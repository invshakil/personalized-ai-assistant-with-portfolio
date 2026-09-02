// Storage for user-chosen dropdown defaults.
//
// The registry (src/lib/formDefaults/registry.ts) decides what may be
// defaulted; this module only stores and returns values. Anything not in the
// registry is refused, so a hand-made request cannot invent a scope.
import { db } from "@/lib/db";
import { DEFAULTABLE_FIELDS, findField, type DefaultMode } from "@/lib/formDefaults/registry";
import type { FormDefaultInput, FormDefaultRow } from "@/types";

const toRow = (r: {
  scope: string;
  field: string;
  value: string;
  mode: string;
}): FormDefaultRow => ({
  scope: r.scope,
  field: r.field,
  value: r.value,
  mode: r.mode === "lastUsed" ? "lastUsed" : "fixed",
});

/**
 * Every stored default. Rows for fields that have since left the registry are
 * dropped rather than returned — the field no longer exists in any form, so a
 * value for it would only confuse the Settings page.
 */
export async function getFormDefaults(): Promise<FormDefaultRow[]> {
  const rows = await db.formDefault.findMany();
  return rows.filter((r) => findField(r.scope, r.field)).map(toRow);
}

/** Set (or clear, with `value: ""`) one default. */
export async function setFormDefault(input: FormDefaultInput): Promise<FormDefaultRow> {
  const entry = findField(input.scope, input.field);
  if (!entry) {
    throw new Error(`"${input.scope}.${input.field}" is not a field that supports a default.`);
  }
  const value = typeof input.value === "string" ? input.value.trim() : "";
  const mode: DefaultMode = input.mode ?? entry.mode;

  const row = await db.formDefault.upsert({
    where: { scope_field: { scope: input.scope, field: input.field } },
    update: { value, mode },
    create: { scope: input.scope, field: input.field, value, mode },
  });
  return toRow(row);
}

/** Remove a default entirely, so the field falls back to the registry's mode. */
export async function clearFormDefault(scope: string, field: string): Promise<void> {
  await db.formDefault.deleteMany({ where: { scope, field } });
}

/**
 * Record what was just saved, for fields whose effective mode is "lastUsed".
 *
 * Called after a successful form submit. Fields in "fixed" mode are left alone
 * — that is the whole difference between the two modes, and enforcing it here
 * rather than on the client means a stale or hand-made request cannot overwrite
 * a deliberately pinned value.
 */
export async function rememberFormValues(
  scope: string,
  values: Record<string, string>
): Promise<void> {
  const stored = await db.formDefault.findMany({ where: { scope } });
  const modeOf = new Map(stored.map((r) => [r.field, r.mode]));

  const writes = Object.entries(values).flatMap(([field, value]) => {
    const entry = findField(scope, field);
    if (!entry) return [];
    // The stored row wins — the user may have switched this field to "fixed".
    const effective = modeOf.get(field) ?? entry.mode;
    if (effective !== "lastUsed") return [];
    const v = typeof value === "string" ? value.trim() : "";
    if (!v) return []; // never remember "nothing chosen"
    return [
      db.formDefault.upsert({
        where: { scope_field: { scope, field } },
        update: { value: v },
        create: { scope, field, value: v, mode: "lastUsed" },
      }),
    ];
  });

  if (writes.length) await db.$transaction(writes);
}

/** The registry, for the Settings page. Re-exported so routes have one import. */
export { DEFAULTABLE_FIELDS };
