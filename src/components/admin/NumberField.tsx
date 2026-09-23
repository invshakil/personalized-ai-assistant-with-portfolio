"use client";

// The one numeric input for the admin. Every number field doubles as a
// calculator: type "200 + 300 + 500" and it settles on 1000 when you leave it.
// Do not use `<TextField type="number">` anywhere — a wiring test enforces it.
//
// It cannot itself be `type="number"`, which rejects "+" and spaces outright, so
// the text is parsed here instead. All decisions live in lib/numberField.ts
// (tested); this file only holds the draft text and wires the events.
//
// Contract with the parent: `onChange` only ever receives a resolved number as
// a string, or "" while the text is mid-expression or breaks the field's rules.
import { useState } from "react";
import { TextField, type TextFieldProps } from "@mui/material";
import {
  emittedValue,
  fieldStatus,
  sanitizeNumberInput,
  settleDraft,
  toDisplay,
  type NumberRules,
} from "@/lib/numberField";

type Passthrough = Omit<TextFieldProps, "value" | "onChange" | "type" | "defaultValue">;

export interface NumberFieldProps extends Passthrough, NumberRules {
  /** Canonical value — a plain number (or its string), or "". */
  value: string | number | null | undefined;
  onChange: (value: string) => void;
}

export default function NumberField({
  value,
  onChange,
  integer,
  min,
  max,
  decimals,
  helperText,
  error,
  onFocus,
  onBlur,
  onKeyDown,
  ...rest
}: NumberFieldProps) {
  const rules: NumberRules = { integer, min, max, decimals };
  // Non-null only while the field is being edited. Keeping the raw text here
  // rather than in the parent is what lets the parent hold a clean number
  // throughout: on settle the draft is dropped and the canonical value shows.
  const [draft, setDraft] = useState<string | null>(null);
  const [settleError, setSettleError] = useState<string | null>(null);

  const settle = () => {
    if (draft === null) return;
    const out = settleDraft(draft, rules);
    setDraft(out.draft);
    setSettleError(out.error);
  };

  const status = fieldStatus(draft, settleError, rules);

  return (
    <TextField
      {...rest}
      type="text"
      autoComplete="off"
      value={draft ?? toDisplay(value)}
      error={Boolean(error) || status.error}
      helperText={status.text ?? helperText}
      slotProps={{
        ...rest.slotProps,
        htmlInput: { inputMode: "decimal", ...(rest.slotProps?.htmlInput as object) },
      }}
      onChange={(e) => {
        const text = sanitizeNumberInput(e.target.value);
        setDraft(text);
        setSettleError(null);
        onChange(emittedValue(text, rules));
      }}
      onFocus={(e) => {
        setDraft((d) => d ?? toDisplay(value));
        onFocus?.(e);
      }}
      onBlur={(e) => {
        settle();
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault(); // resolve the sum rather than submitting the form
          settle();
        }
        onKeyDown?.(e);
      }}
    />
  );
}
