import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">🔍</div>
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Page not found</h1>
        <p className="mb-6 text-sm text-gray-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
