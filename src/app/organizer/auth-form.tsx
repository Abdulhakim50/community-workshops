"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const isSignUp = mode === "sign-up";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const result = isSignUp
      ? await authClient.signUp.email({
          name: String(data.get("name") ?? "").trim(),
          email,
          password,
        })
      : await authClient.signIn.email({ email, password });

    setPending(false);
    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      return;
    }

    router.push("/organizer");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-[#dce1d6] bg-white p-6 shadow-sm sm:p-8">
      {isSignUp && (
        <label className="block text-sm font-semibold">
          Organizer name
          <input name="name" type="text" required autoComplete="name" maxLength={100} className="mt-2 block w-full rounded-lg border border-[#bdc8bc] px-4 py-3 font-normal" />
        </label>
      )}
      <label className="block text-sm font-semibold">
        Email
        <input name="email" type="email" required autoComplete="email" className="mt-2 block w-full rounded-lg border border-[#bdc8bc] px-4 py-3 font-normal" />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input name="password" type="password" required minLength={8} autoComplete={isSignUp ? "new-password" : "current-password"} className="mt-2 block w-full rounded-lg border border-[#bdc8bc] px-4 py-3 font-normal" />
      </label>
      {error && <p role="alert" className="rounded-lg bg-[#fff0e8] px-4 py-3 text-sm text-[#8a341d]">{error}</p>}
      <button type="submit" disabled={pending} className="w-full rounded-lg bg-[#203e32] px-5 py-3 font-semibold text-white hover:bg-[#315849] disabled:opacity-60">
        {pending ? "Please wait…" : isSignUp ? "Create organizer account" : "Sign in"}
      </button>
      <p className="text-sm text-[#596760]">
        {isSignUp ? "Already have an account? " : "New organizer? "}
        <Link className="font-semibold underline" href={isSignUp ? "/organizer/sign-in" : "/organizer/sign-up"}>
          {isSignUp ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
