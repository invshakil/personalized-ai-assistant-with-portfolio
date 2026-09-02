"use client";

import { useCallback, useMemo } from "react";
import { useFormDefaultsContext } from "@/components/admin/FormDefaultsProvider";
import { fieldsForScope, fieldKey } from "@/lib/formDefaults/registry";

/**
 * Valid choices per field, used to check a stored default is still real.
 * Pass the same ids the form's dropdown will render.
 */
export type ValidValues = Record<string, readonly string[]>;

/**
 * Read the dropdown defaults for one form.
 *
 * ```ts
 * const defaults = useFormDefaults("money.entry");
 * // open-add only — never open-edit, or editing would rewrite the record
 * setForm({ ...BLANK_ENTRY, date: todayInput(), ...defaults.seed({ accountId: accountIds }) });
 * // after a successful save
 * defaults.remember({ categoryId: form.categoryId });
 * ```
 */
export function useFormDefaults(scope: string) {
  const { byKey, loaded, remember: rememberValues } = useFormDefaultsContext();

  const fields = useMemo(() => fieldsForScope(scope), [scope]);

  /**
   * The defaults to spread into a blank form.
   *
   * A stored value is only returned if it still appears in `valid` for that
   * field. A default pointing at a deleted or deactivated account must degrade
   * to an empty field — never to a broken form, and never to a stale id that
   * would be sent to the API on save. Omit a field from `valid` to skip the
   * check (used for enums whose choices are fixed in the registry).
   */
  const seed = useCallback(
    (valid: ValidValues = {}): Record<string, string> => {
      const out: Record<string, string> = {};
      for (const f of fields) {
        const row = byKey.get(fieldKey(scope, f.field));
        const value = row?.value?.trim();
        if (!value) continue;
        const allowed = valid[f.field];
        if (allowed && !allowed.includes(value)) continue; // stale — drop it
        out[f.field] = value;
      }
      return out;
    },
    [byKey, fields, scope]
  );

  /**
   * Record what was just saved. Only fields in "lastUsed" mode are stored —
   * the server enforces that, so passing extra fields is harmless.
   * Fire-and-forget: never awaited, never surfaces an error.
   */
  const remember = useCallback(
    (values: Record<string, string | null | undefined>) => {
      const clean: Record<string, string> = {};
      for (const [k, v] of Object.entries(values)) if (typeof v === "string" && v) clean[k] = v;
      if (Object.keys(clean).length) rememberValues(scope, clean);
    },
    [rememberValues, scope]
  );

  return { seed, remember, loaded };
}
