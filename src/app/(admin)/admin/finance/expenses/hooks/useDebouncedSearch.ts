import { useState, useEffect } from "react";

/** Local input mirrors `q`, pushed to the URL after a pause. */
export function useDebouncedSearch(q: string, onCommit: (value: string) => void, delay = 350) {
  const [searchInput, setSearchInput] = useState(q);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) onCommit(searchInput);
    }, delay);
    return () => clearTimeout(t);
  }, [searchInput, q, delay, onCommit]);

  return { searchInput, setSearchInput };
}
