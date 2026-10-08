import { Suspense } from "react";
import LogsPage from "./LogsPage";

export const metadata = { title: "Logs" };

export default function Page() {
  // LogsPage reads filter state from the URL via useSearchParams (needs Suspense).
  return (
    <Suspense>
      <LogsPage />
    </Suspense>
  );
}
