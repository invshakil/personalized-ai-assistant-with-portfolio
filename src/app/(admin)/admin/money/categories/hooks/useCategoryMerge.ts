import { useMemo, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyCategoryRow } from "@/types";

/**
 * Owns the "merge into another category" dialog: which duplicate is being
 * folded away, the target picker's options, and the merge mutation.
 *
 * Only same-kind categories are offered as targets. The server refuses a
 * cross-kind merge — a CREDIT entry must point at an INCOME category and a
 * DEBIT at an EXPENSE one (`assertCategoryMatchesDirection`) — so the picker
 * shouldn't dangle an option that is guaranteed to fail.
 *
 * `open` is tracked separately from `source` so the dialog keeps rendering the
 * category it was working on through its close transition. Clearing `source` to
 * close would blank the name mid-fade ('Delete "undefined" afterwards').
 */
export function useCategoryMerge(
  categories: MoneyCategoryRow[],
  onMerged: (message: string) => void
) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<MoneyCategoryRow | null>(null);
  const [targetId, setTargetId] = useState("");
  const [deleteSource, setDeleteSource] = useState(true);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetOptions = useMemo(() => {
    if (!source) return [];
    return categories
      .filter((c) => c.id !== source.id && c.kind === source.kind)
      .map((c) => ({ value: c.id, label: `${c.name} (${c.entryCount})` }));
  }, [categories, source]);

  const openMerge = (c: MoneyCategoryRow) => {
    setSource(c);
    setTargetId("");
    setDeleteSource(true);
    setError(null);
    setOpen(true);
  };

  const closeMerge = () => {
    setOpen(false);
    setError(null);
  };

  const merge = async () => {
    if (!source || !targetId) return;
    setMerging(true);
    setError(null);
    try {
      const res = await moneyApi.mergeCategory(source.id, { targetId, deleteSource });
      setOpen(false);
      // Name the categories from local state rather than echoing the response:
      // a payload that came back without `data` would otherwise report the
      // merge as having moved entries into "undefined".
      const target = categories.find((c) => c.id === targetId);
      const moved = res?.movedEntries ?? 0;
      onMerged(
        `Moved ${moved} entr${moved === 1 ? "y" : "ies"} into "${target?.name ?? "the category"}"` +
          ((res?.sourceDeleted ?? deleteSource) ? ` and deleted "${source.name}".` : ".")
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to merge");
    } finally {
      setMerging(false);
    }
  };

  return {
    open,
    source,
    targetId,
    setTargetId,
    deleteSource,
    setDeleteSource,
    targetOptions,
    merging,
    error,
    openMerge,
    closeMerge,
    merge,
  };
}
