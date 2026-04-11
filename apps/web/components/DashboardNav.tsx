"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: "🏠", exact: true },
  { label: "Activity Data", href: "/dashboard/activity", icon: "⚡", exact: false },
  { label: "Emissions", href: "/dashboard/emissions", icon: "📊", exact: false },
  { label: "Reports", href: "/dashboard/reports", icon: "📄", exact: false },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️", exact: false },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-primary-50 text-primary-700"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
