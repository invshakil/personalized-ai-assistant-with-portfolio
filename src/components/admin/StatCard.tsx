import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  trend?: string;
  icon: LucideIcon;
  accent?: "indigo" | "emerald" | "amber" | "rose";
}

const solidBg = {
  indigo:  "bg-indigo-600",
  emerald: "bg-emerald-500",
  amber:   "bg-amber-500",
  rose:    "bg-rose-500",
};

export default function StatCard({ label, value, trend, icon: Icon, accent = "indigo" }: StatCardProps) {
  const isEmpty = value === "—" || value === "৳—";

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-zinc-800/60 bg-zinc-900 p-5 shadow-lg shadow-black/20">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${solidBg[accent]}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-2xl font-bold leading-none tracking-tight ${isEmpty ? "text-zinc-600" : "text-white"}`}>
          {value}
        </p>
        <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="mt-1 text-xs text-zinc-700">{trend ?? (isEmpty ? "No data yet" : "")}</p>
      </div>
    </div>
  );
}
