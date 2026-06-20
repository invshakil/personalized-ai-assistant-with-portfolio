import { Suspense } from "react";
import ExpensesPage from "./ExpensesPage";

export const metadata = { title: "Property Expenses" };

export default function Page() {
  // ExpensesPage reads filter state from the URL via useSearchParams, which
  // requires a Suspense boundary.
  return (
    <Suspense>
      <ExpensesPage />
    </Suspense>
  );
}
