export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-serif text-gray-900 mb-2">Welcome back, Shakil</h1>
      <p className="text-gray-500 mb-8">Here&apos;s your overview for today.</p>

      {/* Stats grid — to be populated with real data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Units" value="—" />
        <StatCard label="Occupied" value="—" />
        <StatCard label="Rent This Month" value="৳—" />
        <StatCard label="Overdue" value="—" />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}
