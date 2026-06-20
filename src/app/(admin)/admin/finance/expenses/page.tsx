import { Suspense } from "react";
import BizExpensesPage from "./BizExpensesPage";

export const metadata = { title: "Expenses — Financial Tracker" };

export default function Page() {
  // BizExpensesPage reads filter state from the URL via useSearchParams, which
  // requires a Suspense boundary.
  return (
    <Suspense>
      <BizExpensesPage />
    </Suspense>
  );
}
