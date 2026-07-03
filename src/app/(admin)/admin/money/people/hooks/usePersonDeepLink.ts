import { useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

/** Deep link from other money pages: "?person=<id>" opens that person's detail drawer. */
export function usePersonDeepLink(onOpen: (id: string) => void) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const personId = searchParams.get("person");
    if (!personId) return;
    onOpen(personId);
    const next = new URLSearchParams(searchParams.toString());
    next.delete("person");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
}
