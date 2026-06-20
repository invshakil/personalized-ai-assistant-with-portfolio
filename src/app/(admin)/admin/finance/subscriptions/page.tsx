import { Suspense } from "react";
import SubscriptionsPage from "./SubscriptionsPage";

export const metadata = { title: "Subscriptions — Financial Tracker" };

export default function Page() {
  // SubscriptionsPage reads filter state from the URL via useSearchParams, which
  // requires a Suspense boundary.
  return (
    <Suspense>
      <SubscriptionsPage />
    </Suspense>
  );
}
