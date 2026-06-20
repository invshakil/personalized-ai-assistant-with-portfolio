import { Suspense } from "react";
import PaymentsPage from "./PaymentsPage";

export const metadata = { title: "Monthly Payments" };

export default function Page() {
  // PaymentsPage reads filter state from the URL via useSearchParams, which
  // requires a Suspense boundary.
  return (
    <Suspense>
      <PaymentsPage />
    </Suspense>
  );
}
