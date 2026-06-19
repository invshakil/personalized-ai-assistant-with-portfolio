import { Suspense } from "react";
import EntriesPage from "./EntriesPage";

export const metadata = { title: "Ledger — Money Manager" };

export default function Page() {
  // EntriesPage reads filter state from the URL via useSearchParams, which
  // requires a Suspense boundary.
  return (
    <Suspense>
      <EntriesPage />
    </Suspense>
  );
}
