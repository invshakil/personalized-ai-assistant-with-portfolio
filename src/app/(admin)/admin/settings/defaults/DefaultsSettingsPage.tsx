"use client";

import { useMemo, useState } from "react";
import { Alert, Box, CircularProgress } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import { useFormDefaultsContext } from "@/components/admin/FormDefaultsProvider";
import {
  DEFAULTABLE_FIELDS,
  fieldKey,
  type DefaultableField,
  type DefaultMode,
} from "@/lib/formDefaults/registry";
import { useDefaultOptions } from "./hooks/useDefaultOptions";
import DefaultFieldRow from "./components/DefaultFieldRow";
import FormDefaultsGroup from "./components/FormDefaultsGroup";

/** Registry order decides display order, so the page reads the same as the file. */
function groupByForm(fields: DefaultableField[]) {
  const groups: { module: string; form: string; fields: DefaultableField[] }[] = [];
  for (const f of fields) {
    const last = groups.at(-1);
    if (last && last.module === f.module && last.form === f.form) last.fields.push(f);
    else groups.push({ module: f.module, form: f.form, fields: [f] });
  }
  return groups;
}

export default function DefaultsSettingsPage() {
  const { byKey, loaded, setDefault, clearDefault } = useFormDefaultsContext();
  const { options, loading, error } = useDefaultOptions();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const groups = useMemo(() => groupByForm(DEFAULTABLE_FIELDS), []);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setSaveError(null);
    try {
      await action();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save that default.");
    } finally {
      setBusy(null);
    }
  };

  const header = (
    <PageHeader
      title="Form Defaults"
      subtitle="What each dropdown starts as when you open a form to add something new."
    />
  );

  if (loading || !loaded) {
    return (
      <Box>
        {header}
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {header}

      <Alert severity="info" sx={{ mb: 3 }}>
        Defaults apply only when you open a form to add something new — editing an existing record
        always shows that record&apos;s own values. <strong>Fixed</strong> always starts with the
        value you pick; <strong>Last used</strong> follows whatever you saved most recently.
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSaveError(null)}>
          {saveError}
        </Alert>
      )}

      {groups.map((g) => (
        <FormDefaultsGroup key={`${g.module}|${g.form}`} module={g.module} form={g.form}>
          {g.fields.map((f) => {
            const key = fieldKey(f.scope, f.field);
            const row = byKey.get(key);
            return (
              <DefaultFieldRow
                key={key}
                field={f}
                value={row?.value ?? ""}
                mode={row?.mode ?? f.mode}
                stored={!!row}
                options={f.source === "enum" ? (f.options ?? []) : (options[f.source] ?? [])}
                disabled={busy === key}
                onValueChange={(value) =>
                  run(key, () => setDefault(f.scope, f.field, value, row?.mode ?? f.mode))
                }
                onModeChange={(mode: DefaultMode) =>
                  run(key, () => setDefault(f.scope, f.field, row?.value ?? "", mode))
                }
                onReset={() => run(key, () => clearDefault(f.scope, f.field))}
              />
            );
          })}
        </FormDefaultsGroup>
      ))}
    </Box>
  );
}
