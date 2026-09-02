"use client";

// An amount input that doubles as a calculator: type "200 + 300 + 500" and the
// field settles on 1000 when you leave it. For adding up a handful of receipts
// without reaching for a separate calculator and copying the total back.
//
// It cannot be `type="number"`, which rejects "+" and spaces outright, so the
// value is parsed here instead — see lib/calcExpression.ts for the grammar.
//
// The contract with the parent is the important part: **the parent only ever
// receives a resolved number as a string.** While the text is mid-expression
// the parent gets "" rather than a partial read, because parseFloat("200 + 300")
// is 200 — a form submitted at that moment would otherwise save the wrong
// figure with nothing to show for it. An empty amount fails loudly on save;
// a plausible wrong one does not.
import { useState } from "react";
import { TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { evaluateExpression, isExpression, toAmountString } from "@/lib/calcExpression";

/** Characters the grammar accepts; anything else is dropped as it is typed. */
const ALLOWED = /[^0-9+\-*/(). ]/g;

interface AmountFieldProps {
  label: string;
  /** Canonical value — a plain number as a string, or "". */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "small" | "medium";
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
  /** Shown when the field is idle and there is nothing more useful to say. */
  helperText?: string;
}

const preview = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

export default function AmountField({
  label,
  value,
  onChange,
  disabled = false,
  size = "small",
  fullWidth = true,
  sx,
  helperText,
}: AmountFieldProps) {
  // Non-null only while the field is being edited. Keeping the raw text here
  // rather than in the parent is what lets the parent hold a clean number
  // throughout: on blur the draft is dropped and the canonical value shows.
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);

  const shown = draft ?? value;
  const result = draft === null ? null : evaluateExpression(draft);

  const handleChange = (raw: string) => {
    const text = raw.replace(ALLOWED, "");
    setDraft(text);
    setInvalid(false);
    const next = evaluateExpression(text);
    onChange(next.ok && next.value !== null ? toAmountString(next.value) : "");
  };

  const settle = () => {
    if (draft === null) return;
    // An empty field is a legitimate state, not a parse failure.
    if (draft.trim() === "") {
      setDraft(null);
      setInvalid(false);
      return;
    }
    const next = evaluateExpression(draft);
    if (next.ok) {
      setDraft(null); // fall back to the resolved value the parent now holds
      setInvalid(false);
    } else {
      setInvalid(true); // keep the text so it can be corrected, not retyped
    }
  };

  // While typing, an incomplete expression ("200 +") is normal and says nothing.
  // The error is only worth raising once the field has been left.
  const status = invalid
    ? { error: true, text: "Not a valid amount" }
    : draft !== null && isExpression(draft) && result?.ok && result.value !== null
      ? { error: false, text: `= ${preview(result.value)}` }
      : { error: false, text: helperText };

  return (
    <TextField
      label={label}
      type="text"
      autoComplete="off"
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      value={shown}
      error={status.error}
      helperText={status.text}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={() => setDraft((d) => d ?? value)}
      onBlur={settle}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault(); // resolve the sum rather than submitting it
          settle();
        }
      }}
      sx={sx}
    />
  );
}
