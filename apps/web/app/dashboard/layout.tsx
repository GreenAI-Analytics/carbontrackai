import Link from "next/link";
import Image from "next/image";
import DashboardNav from "@/components/DashboardNav";
import SignOutButton from "@/components/SignOutButton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/img/carbontrack-ai-logo.png"
              alt="CarbonTrackAI logo"
              width={192}
              height={48}
              className="h-12 w-auto"
              style={{ width: "auto" }}
            />
          </Link>
          <SignOutButton />
        </div>
      </header>

      {/* Body: sidebar + page content */}
      <div className="flex flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 gap-8">
        <aside className="w-56 shrink-0">
          <DashboardNav />
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
