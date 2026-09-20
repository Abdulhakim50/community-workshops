"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/organizer/sign-in");
    router.refresh();
  }

  return <button type="button" onClick={signOut} className="rounded-lg border border-[#bdc8bc] px-4 py-2 text-sm font-semibold hover:bg-[#edf2e6]">Sign out</button>;
}
