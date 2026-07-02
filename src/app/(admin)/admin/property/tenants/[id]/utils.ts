export const STATUS_COLORS: Record<string, string> = {
  PAID: "success.main",
  PARTIAL: "warning.main",
  PENDING: "text.secondary",
  OVERDUE: "error.main",
};

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

export function isBeforeMoveIn(month: number, year: number, moveInDate: string) {
  const d = new Date(moveInDate);
  const moveInYear = d.getFullYear();
  const moveInMonth = d.getMonth() + 1;
  return year < moveInYear || (year === moveInYear && month < moveInMonth);
}
