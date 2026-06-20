import { Suspense } from "react";
import EarningsPage from "./EarningsPage";

export const metadata = { title: "Earnings — Financial Tracker" };

export default function Page() {
  // EarningsPage reads filter state from the URL via useSearchParams, which
  // requires a Suspense boundary.
  return (
    <Suspense>
      <EarningsPage />
    </Suspense>
  );
}
