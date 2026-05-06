"use client";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="bg-gray-50 font-sans antialiased">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="max-w-md text-center">
            <div className="mb-6 text-6xl">🔴</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Application Error</h1>
            <p className="mb-2 text-sm text-gray-500">
              A critical error occurred. Please try refreshing the page.
            </p>
            {error.digest && (
              <p className="mb-6 text-xs text-gray-400 font-mono">
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
