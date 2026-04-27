"use client";

import Link from "next/link";

export default function BiodiversityPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/dashboard" className="text-sm text-primary-600 hover:text-primary-700">
          ← Back to Overview
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Biodiversity & Ecosystems</h1>
        <p className="text-gray-600">ESRS E4-1 to E4-6 • Assess site proximity to sensitive areas, manage biodiversity action plans and offsets.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
        <div className="text-5xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Coming soon</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          This module is in development. Check back soon for data entry forms, calculations, and reporting.
        </p>
      </div>
    </div>
  );
}
