"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase-browser";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const redirectTo = `${window.location.origin}/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setMessage("Reset link sent. Please check your inbox.");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-green-100 bg-white p-8 shadow-lg">
        <Link href="/" className="mb-6 inline-flex items-center gap-2">
          <Image
            src="/img/carbontrack-ai-logo.png"
            alt="CarbonTrackAI logo"
            width={192}
            height={48}
            className="h-12 w-auto"
            style={{ width: "auto" }}
            priority
          />
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
        <p className="mt-2 text-gray-600">Enter your account email and we will send a reset link.</p>

        <form onSubmit={handleResetRequest} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
              placeholder="you@company.com"
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          {message ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-5 text-sm">
          <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">
            Back to login
          </Link>
        </div>
      </section>
    </main>
  );
}
