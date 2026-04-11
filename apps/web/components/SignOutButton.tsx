"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
    >
      Sign out
    </button>
  );
}
