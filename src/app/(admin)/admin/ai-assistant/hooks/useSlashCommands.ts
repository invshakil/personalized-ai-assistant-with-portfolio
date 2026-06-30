import { useCallback, useEffect, useMemo, useState } from "react";
import { SLASH_COMMANDS, SLASH_TYPING_RE } from "../commands";

export function useSlashCommands(
  input: string,
  setInput: (v: string) => void,
  isStreaming: boolean,
  blocked: boolean
) {
  const [index, setIndex] = useState(0);

  const matches = useMemo(() => {
    const m = input.match(SLASH_TYPING_RE);
    if (!m) return [];
    const partial = `/${m[1].toLowerCase()}`;
    return SLASH_COMMANDS.filter((c) => c.cmd.startsWith(partial));
  }, [input]);

  const open = matches.length > 0 && !isStreaming && !blocked;

  useEffect(() => {
    setIndex((i) => (i >= matches.length ? 0 : i));
  }, [matches.length]);

  const apply = useCallback(
    (cmd: string) => {
      setInput(input.replace(SLASH_TYPING_RE, `${cmd} `));
      setIndex(0);
    },
    [input, setInput]
  );

  return { matches, open, index, setIndex, apply };
}
