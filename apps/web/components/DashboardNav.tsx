"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavGroup = {
  label: string;
  items: Array<{
    label: string;
    href: string;
    exact?: boolean;
  }>;
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", exact: true }],
  },
  {
    label: "General Disclosures",
    items: [
      { label: "Governance & Strategy", href: "/dashboard/esg/general/governance" },
      { label: "IRO Management", href: "/dashboard/esg/general/iro-management" },
    ],
  },
  {
    label: "Environmental",
    items: [
      { label: "Energy & Emissions", href: "/dashboard/esg/environmental/climate" },
      { label: "Activity Data", href: "/dashboard/activity" },
      { label: "Emissions Results", href: "/dashboard/emissions" },
      { label: "Pollution", href: "/dashboard/esg/environmental/pollution" },
      { label: "Water & Marine", href: "/dashboard/esg/environmental/water" },
      { label: "Biodiversity", href: "/dashboard/esg/environmental/biodiversity" },
      { label: "Circular Economy", href: "/dashboard/esg/environmental/circular" },
    ],
  },
  {
    label: "Social",
    items: [
      { label: "Own Workforce", href: "/dashboard/esg/social/workforce" },
      { label: "Value Chain", href: "/dashboard/esg/social/valuechain" },
      { label: "Communities", href: "/dashboard/esg/social/communities" },
      { label: "Consumers", href: "/dashboard/esg/social/consumers" },
    ],
  },
  {
    label: "Governance",
    items: [
      { label: "Business Ethics", href: "/dashboard/esg/governance/ethics" },
      { label: "Compliance", href: "/dashboard/esg/governance/compliance" },
      { label: "Data Privacy", href: "/dashboard/esg/governance/dataprivacy" },
    ],
  },
  {
    label: "Cross-Cutting",
    items: [
      { label: "Double Materiality", href: "/dashboard/materiality" },
      { label: "EU Taxonomy", href: "/dashboard/taxonomy" },
      { label: "Report Builder", href: "/dashboard/reports" },
    ],
  },
  {
    label: "Platform",
    items: [{ label: "Admin", href: "/dashboard/admin" },{ label: "Settings", href: "/dashboard/settings" }],
  },
];

export default function DashboardNav() {
  const pathname = usePathname();

  function isActive(href: string, exact?: boolean): boolean {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <nav className="space-y-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive(item.href, item.exact)
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
