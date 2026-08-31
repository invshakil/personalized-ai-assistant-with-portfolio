import { useRef, useState } from "react";
import type { ImportMapping } from "@/lib/api/money";

/** Owns the selected CSV file, its parsed header row, and the resulting column mapping —
 * including best-effort auto-mapping by header name when a new file is chosen. */
export function useCsvFile() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({ date: "", amount: "" });

  const onFile = async (f: File | null) => {
    setFile(f);
    if (!f) {
      setHeaders([]);
      return;
    }
    const text = await f.text();
    const firstLine = text.split(/\r?\n/)[0] ?? "";
    const cols = firstLine
      .replace(/^﻿/, "")
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));
    setHeaders(cols);
    // Best-effort auto-mapping by header name.
    const find = (re: RegExp) => cols.find((c) => re.test(c)) ?? "";
    const category = find(/categor/i) || undefined;
    const description = find(/desc|detail|narration|particular/i) || undefined;
    setMapping({
      date: find(/date/i),
      amount: find(/amount|amt|value/i),
      direction: find(/type|direction|dr.?cr|debit|credit/i) || undefined,
      category,
      account: find(/account|wallet|bank/i) || undefined,
      description,
      notes: find(/note/i) || undefined,
      // Default on exactly where it helps: there is something to read and
      // nothing already answering the question. A file that carries its own
      // category column doesn't need the model, and shouldn't pay for it.
      aiCategorize: !!description && !category,
    });
  };

  const reset = () => {
    setFile(null);
    setHeaders([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return { fileRef, file, headers, mapping, setMapping, onFile, reset };
}
