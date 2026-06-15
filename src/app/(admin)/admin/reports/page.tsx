import { redirect } from "next/navigation";

// The Reports group lands on the Financial Tracker report by default.
export default function Page() {
  redirect("/admin/reports/financial");
}
