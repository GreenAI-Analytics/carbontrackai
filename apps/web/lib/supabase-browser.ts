import { createBrowserClient } from "@supabase/ssr";

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // During build/prerender, env vars may not be available.
    // Return a mock that throws only when actually used, not at import time.
    if (typeof window === "undefined") {
      // Server-side prerender: return a minimal mock
      return createBrowserClient(url || "https://placeholder.supabase.co", key || "placeholder-key");
    }
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createBrowserClient(url, key);
}

export const supabase = getSupabaseClient();
