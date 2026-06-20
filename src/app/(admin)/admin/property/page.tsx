import { Suspense } from "react";
import PropertyPage from "./PropertyPage";

export const metadata = { title: "Property" };

export default function Page() {
  // PropertyPage reads filter/tab state from the URL via useSearchParams, which
  // requires a Suspense boundary.
  return (
    <Suspense>
      <PropertyPage />
    </Suspense>
  );
}
