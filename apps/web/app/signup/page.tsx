"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    // If the user session was created immediately (email confirmations disabled),
    // redirect straight to onboarding
    if (data?.user?.aud === "authenticated" || data?.session) {
      router.push("/onboarding");
      return;
    }

    // Otherwise, show confirmation email message
    setMessage(
      "Account created! Check your inbox and click the confirmation link to continue."
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-green-100 bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Image
              src="/img/carbontrack-ai-logo.png"
              alt="CarbonTrackAI logo"
              width={128}
              height={32}
              className="h-8 w-auto"
              style={{ width: "auto" }}
              priority
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600">Free for Scope 1 &amp; 2 reporting. No credit card needed.</p>
        </div>

        {message ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
            <div className="text-3xl mb-2">📬</div>
            <p className="font-semibold text-green-800">Check your inbox</p>
            <p className="mt-1 text-sm text-green-700">{message}</p>
            <Link
              href="/login"
              className="mt-4 inline-block text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-gray-700">
                Full name
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                placeholder="At least 8 characters"
              />
            </div>

            {error ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating account..." : "Create free account"}
            </button>

            <p className="text-center text-xs text-gray-500">
              By signing up you agree to our{" "}
              <Link href="#" className="text-primary-700 hover:underline">Terms</Link>
              {" "}and{" "}
              <Link href="#" className="text-primary-700 hover:underline">Privacy Policy</Link>.
            </p>
          </form>
        )}

        {!message && (
          <p className="mt-5 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary-700 hover:text-primary-800">
              Log in
            </Link>
          </p>
        )}
      </section>
    </main>
  );
}
