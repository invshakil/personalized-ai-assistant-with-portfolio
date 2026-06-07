"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "⊞" },
  { href: "/dashboard/property", label: "Property", icon: "🏠" },
  { href: "/dashboard/finance", label: "Finance", icon: "₿" },
  { href: "/dashboard/renovation", label: "Renovation", icon: "🔧" },
  { href: "/dashboard/ai-assistant", label: "AI Assistant", icon: "✦" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <Link href="/" className="text-lg font-serif text-gray-900 hover:text-green-700 transition-colors">
          sshakil.com
        </Link>
        <p className="text-xs text-gray-400 mt-0.5">Admin Dashboard</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-green-50 text-green-800 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Sign out */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <span>→</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
